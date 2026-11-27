import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const retrieve = vi.fn();
  const getServerSession = vi.fn();
  const checkRateLimitStrict = vi.fn();
  return { retrieve, getServerSession, checkRateLimitStrict };
});

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }),
}));
vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimitStrict: mocks.checkRateLimitStrict,
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 1, retryAfter: 0 }),
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));

import { GET } from "./route";

function get(): NextRequest {
  return new NextRequest(
    "https://app.example/api/payments/status?session_id=cs_test_abc123",
    { headers: { "x-forwarded-for": "10.0.0.1" } }
  );
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_abc123",
    status: "complete",
    payment_status: "paid",
    amount_total: 999,
    currency: "usd",
    customer_details: { email: "buyer@example.com" },
    metadata: { user_id: "guest" },
    ...overrides,
  };
}

describe("GET /api/payments/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.retrieve.mockResolvedValue(session());
    mocks.getServerSession.mockResolvedValue(null);
    mocks.checkRateLimitStrict.mockResolvedValue({ allowed: true, remaining: 29, retryAfter: 0 });
  });

  it("returns status for a guest checkout without leaking the customer email", async () => {
    const res = await GET(get());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      status: "complete",
      paymentStatus: "paid",
      amountTotal: 999,
    });
    expect(JSON.stringify(body)).not.toContain("buyer@example.com");
  });

  it("refuses a session that belongs to another signed-in user", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.retrieve.mockResolvedValue(session({ metadata: { user_id: "user-2" } }));

    const res = await GET(get());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("allows the signed-in owner", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.retrieve.mockResolvedValue(session({ metadata: { user_id: "user-1" } }));

    const res = await GET(get());

    expect(res.status).toBe(200);
  });

  it("rate limits status lookups", async () => {
    mocks.checkRateLimitStrict.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 30 });

    const res = await GET(get());

    expect(res.status).toBe(429);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it("returns 503 before contacting Stripe when the strict limiter fails", async () => {
    mocks.checkRateLimitStrict.mockRejectedValueOnce(new Error("offline"));
    const response = await GET(get());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
});
