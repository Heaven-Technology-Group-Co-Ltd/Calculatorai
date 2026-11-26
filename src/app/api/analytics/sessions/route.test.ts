import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ from: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/admin/auth-middleware", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin" }), adminGateErrorResponse: () => null }));
import { GET } from "./route";

describe("session analytics", () => {
  it("groups bounded page views into live sessions", async () => {
    const now = new Date().toISOString();
    mocks.limit.mockResolvedValueOnce({ data: [{ session_id: "one", created_at: now }, { session_id: "one", created_at: now }], error: null });
    mocks.limit.mockResolvedValueOnce({ data: [{ session_id: "one" }], error: null });
    mocks.from.mockImplementation((table: string) => {
      expect(["page_views", "formula_usage"]).toContain(table);
      const chain = { select: () => chain, gte: () => chain, not: () => chain, order: () => chain, limit: mocks.limit };
      return chain;
    });
    const response = await GET(new NextRequest("https://example.com/api/analytics/sessions"));
    const body = await response.json();
    expect(body.data).toMatchObject({ activeSessions: 1, bounceRate: 0, conversionRate: 100 });
    expect(mocks.limit).toHaveBeenCalledWith(10000);
  });
});
