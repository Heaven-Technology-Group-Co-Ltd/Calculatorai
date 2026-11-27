import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ from: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: vi.fn().mockResolvedValue({ ok: true, user: { id: "admin", is_admin: true } }) }));
import { GET } from "./route";

describe("traffic analytics", () => {
  it("caps the sample and returns an exact total", async () => {
    mocks.limit.mockResolvedValue({ data: [{ path: "/", country: "TH", referrer: null }], error: null });
    mocks.from.mockReturnValueOnce({ select: () => ({ gte: () => ({ order: () => ({ limit: mocks.limit }) }) }) });
    mocks.from.mockReturnValueOnce({ select: () => ({ gte: () => Promise.resolve({ count: 10001, error: null }) }) });
    const response = await GET(new NextRequest("https://example.com/api/analytics/traffic"));
    const body = await response.json();
    expect(mocks.limit).toHaveBeenCalledWith(10000);
    expect(body.data.totalViews).toBe(10001);
  });
});
