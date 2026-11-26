import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    paymentIntents: { retrieve: mocks.retrievePaymentIntent },
  }),
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { POST } from "./route";

function makeWebhookRequest(body = "{}"): NextRequest {
  return new NextRequest("https://app.example/api/payments/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=sig" },
    body,
  });
}

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.retrievePaymentIntent.mockResolvedValue({ status: "succeeded" });
  });

  it("grants entitlement on checkout.session.completed (payments.user_id, users.plan, subscriptions)", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          payment_intent: "pi_1",
          amount_total: 7999,
          currency: "usd",
          customer_email: "buyer@example.com",
          metadata: { user_id: "user-123", plan: "yearly" },
        },
      },
    });

    const stripeEventsInsert = vi.fn().mockResolvedValue({ error: null });
    const paymentsInsert = vi.fn().mockResolvedValue({ error: null });
    const usersUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const usersUpdate = vi.fn().mockReturnValue({ eq: usersUpdateEq });
    const subsInsert = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return { insert: stripeEventsInsert };
      }
      if (table === "payments") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          insert: paymentsInsert,
        };
      }
      if (table === "users") {
        return { update: usersUpdate };
      }
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
              }),
            }),
          }),
          insert: subsInsert,
        };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, received: true });
    expect(paymentsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        stripe_session_id: "cs_1",
        amount_cents: 7999,
      })
    );
    expect(usersUpdate).toHaveBeenCalledWith({ plan: "yearly" });
    expect(usersUpdateEq).toHaveBeenCalledWith("id", "user-123");
    expect(subsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        plan: "yearly",
        amount_monthly: 667,
        status: "active",
      })
    );
  });

  it("returns 200 duplicate on 23505 unique violation without mutating payments or users", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: { object: { id: "cs_dup" } },
    });

    const paymentsInsert = vi.fn();
    const usersUpdate = vi.fn();

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return {
          insert: vi.fn().mockResolvedValue({
            error: { code: "23505", message: "duplicate key" },
          }),
        };
      }
      if (table === "payments") return { insert: paymentsInsert };
      if (table === "users") return { update: usersUpdate };
      return {};
    });

    const res = await POST(makeWebhookRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, received: true, duplicate: true });
    expect(paymentsInsert).not.toHaveBeenCalled();
    expect(usersUpdate).not.toHaveBeenCalled();
  });

  it("deletes stripe_events claim row and returns 500 when downstream DB write fails", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_fail",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_fail",
          payment_intent: "pi_fail",
          amount_total: 999,
          currency: "usd",
          customer_email: "buyer@example.com",
          metadata: { user_id: "user-123", plan: "monthly" },
        },
      },
    });

    const claimDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const claimDelete = vi.fn().mockReturnValue({ eq: claimDeleteEq });

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: claimDelete,
        };
      }
      if (table === "payments") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: "db write failed" } }),
        };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(claimDelete).toHaveBeenCalled();
    expect(claimDeleteEq).toHaveBeenCalledWith("event_id", "evt_fail");
  });
});
