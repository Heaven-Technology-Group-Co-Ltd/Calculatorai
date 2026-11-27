import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const create = vi.fn().mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/1" });
  return { maintenance: vi.fn(), create, getStripe: vi.fn(() => ({ checkout: { sessions: { create } } })) };
});

vi.mock("@/lib/admin/state", () => ({ readMaintenanceState: mocks.maintenance }));

vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 19, retryAfter: 0 }),
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

import { POST } from "./route";

function post(host: string, successUrl: string, cancelUrl: string): NextRequest {
  return new NextRequest(`https://${host}/api/payments/create-checkout-session`, {
    method: "POST",
    headers: { "content-type": "application/json", host, "x-forwarded-for": "10.0.0.1" },
    body: JSON.stringify({ planId: "monthly", successUrl, cancelUrl }),
  });
}

describe("POST /api/payments/create-checkout-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maintenance.mockResolvedValue({ maintenanceMode: false });
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("rejects checkout during maintenance", async () => {
    mocks.maintenance.mockResolvedValue({ maintenanceMode: true });
    expect((await POST(post("app.example", "https://app.example/paid", "https://app.example/cancel"))).status).toBe(503);
  });

  it("rejects redirect URLs that only match an attacker-supplied Host header", async () => {
    const res = await POST(
      post("attacker.example", "https://attacker.example/paid", "https://attacker.example/cancel")
    );

    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("fails closed when the app origin is not configured", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    const res = await POST(
      post("app.example", "https://app.example/paid", "https://app.example/cancel")
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts successUrl with Stripe template variable {CHECKOUT_SESSION_ID}", async () => {
    const res = await POST(
      post(
        "app.example",
        "https://app.example/purchase/success?session_id={CHECKOUT_SESSION_ID}",
        "https://app.example/purchase?canceled=true"
      )
    );

    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://app.example/purchase/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://app.example/purchase?canceled=true",
      })
    );
  });

  it("accepts redirect URLs on the configured app origin", async () => {
    const res = await POST(
      post("app.example", "https://app.example/paid", "https://app.example/cancel")
    );

    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
