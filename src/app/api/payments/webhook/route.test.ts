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
      if (table === "users") {
        return {
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
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
          insert: vi.fn().mockResolvedValue({ error: null }),
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

  it("grants entitlement (users.plan + subscriptions) even if payments throws 42P01", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_42p01",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_42p01",
          payment_intent: "pi_42p01",
          amount_total: 7999,
          currency: "usd",
          customer_email: "buyer@example.com",
          metadata: { user_id: "user-123", plan: "yearly" },
        },
      },
    });

    const usersUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const usersUpdate = vi.fn().mockReturnValue({ eq: usersUpdateEq });
    const subsInsert = vi.fn().mockResolvedValue({ error: null });
    const claimDelete = vi.fn();

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: claimDelete,
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
      if (table === "payments") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { code: "42P01", message: "relation \"payments\" does not exist" } }),
        };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, received: true });
    expect(usersUpdate).toHaveBeenCalledWith({ plan: "yearly" });
    expect(subsInsert).toHaveBeenCalledTimes(1);
    expect(claimDelete).not.toHaveBeenCalled();
  });

  it("returns 200 unlinked without releasing stripe_events claim for unresolvable guest checkout", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_guest",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_guest",
          payment_intent: "pi_guest",
          amount_total: 999,
          currency: "usd",
          customer_email: null,
          customer_details: { email: "nobody@example.com" },
          metadata: { user_id: "guest", plan: "monthly" },
        },
      },
    });

    const claimDelete = vi.fn();
    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: claimDelete,
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, received: true, unlinked: true });
    expect(claimDelete).not.toHaveBeenCalled();
  });

  it("does not downgrade users.plan or cancel subscriptions on partial refund", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_partial_refund",
      type: "charge.refunded",
      data: {
        object: {
          payment_intent: "pi_partial",
          refunded: false,
          amount: 7999,
          amount_refunded: 2000,
        },
      },
    });

    const paymentsUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const paymentsUpdate = vi.fn().mockReturnValue({ eq: paymentsUpdateEq });
    const usersUpdate = vi.fn();
    const subsUpdate = vi.fn();

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "payments") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "pay_1", user_id: "user-123", created_at: "2026-01-01T00:00:00.000Z" },
                error: null,
              }),
            }),
          }),
          update: paymentsUpdate,
        };
      }
      if (table === "users") return { update: usersUpdate };
      if (table === "subscriptions") return { update: subsUpdate };
      return {};
    });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(paymentsUpdate).toHaveBeenCalledWith({ status: "partially_refunded" });
    expect(usersUpdate).not.toHaveBeenCalled();
    expect(subsUpdate).not.toHaveBeenCalled();
  });

  it("preserves active plan when an older charge is fully refunded but a newer unrefunded payment exists", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_old_refund",
      type: "charge.refunded",
      data: {
        object: {
          payment_intent: "pi_old",
          refunded: true,
          amount: 999,
          amount_refunded: 999,
        },
      },
    });

    const paymentsUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const paymentsUpdate = vi.fn().mockReturnValue({ eq: paymentsUpdateEq });
    const usersUpdate = vi.fn();
    const subsUpdate = vi.fn();

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "payments") {
        return {
          select: (cols: string) => {
            if (cols.includes("user_id")) {
              return {
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "pay_old", user_id: "user-123", created_at: "2026-01-01T00:00:00.000Z" },
                    error: null,
                  }),
                }),
              };
            }
            return {
              eq: () => ({
                in: () => ({
                  neq: () => ({
                    limit: vi.fn().mockResolvedValue({ data: [{ id: "pay_new" }], error: null }),
                  }),
                }),
              }),
            };
          },
          update: paymentsUpdate,
        };
      }
      if (table === "users") return { update: usersUpdate };
      if (table === "subscriptions") return { update: subsUpdate };
      return {};
    });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(paymentsUpdate).toHaveBeenCalledWith({ status: "refunded" });
    expect(usersUpdate).not.toHaveBeenCalled();
    expect(subsUpdate).not.toHaveBeenCalled();
  });

  it("downgrades users.plan to free and cancels subscription on full refund of sole payment", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_full_refund",
      type: "charge.refunded",
      data: {
        object: {
          payment_intent: { id: "pi_sole" },
          refunded: true,
          amount: 7999,
          amount_refunded: 7999,
        },
      },
    });

    const paymentsUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const paymentsUpdate = vi.fn().mockReturnValue({ eq: paymentsUpdateEq });
    const usersUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const usersUpdate = vi.fn().mockReturnValue({ eq: usersUpdateEq });
    const subsUpdateEq2 = vi.fn().mockResolvedValue({ error: null });
    const subsUpdateEq1 = vi.fn().mockReturnValue({ eq: subsUpdateEq2 });
    const subsUpdate = vi.fn().mockReturnValue({ eq: subsUpdateEq1 });

    mocks.from.mockImplementation((table: string) => {
      if (table === "stripe_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "payments") {
        return {
          select: (cols: string) => {
            if (cols.includes("user_id")) {
              return {
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "pay_sole", user_id: "user-123", created_at: "2026-01-01T00:00:00.000Z" },
                    error: null,
                  }),
                }),
              };
            }
            return {
              eq: () => ({
                in: () => ({
                  neq: () => ({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            };
          },
          update: paymentsUpdate,
        };
      }
      if (table === "users") return { update: usersUpdate };
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "sub_sole", started_at: "2026-01-01T00:00:02.000Z", created_at: "2026-01-01T00:00:02.000Z" }], error: null }),
            }),
          }),
          update: subsUpdate,
        };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(paymentsUpdate).toHaveBeenCalledWith({ status: "refunded" });
    expect(usersUpdate).toHaveBeenCalledWith({ plan: "free" });
    expect(usersUpdateEq).toHaveBeenCalledWith("id", "user-123");
    expect(subsUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled" }));
  });
});
