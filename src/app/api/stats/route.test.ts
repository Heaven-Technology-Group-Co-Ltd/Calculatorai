import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ from: vi.fn(), calls: [] as string[] }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: vi.fn().mockResolvedValue({ ok: true, user: { id: "admin", is_admin: true } }) }));
import { GET } from "./route";

describe("GET /api/stats", () => {
  it("uses one page view range for live visitors and daily devices", async () => {
    mocks.calls.length = 0;
    const now = new Date().toISOString();
    mocks.from.mockImplementation((table: string) => {
      mocks.calls.push(table);
      let columns = "";
      const chain = {
        select: (selection: string) => { columns = selection; return chain; },
        gte: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        then: (resolve: (value: unknown) => void) => resolve({
          data: table === "page_views" && columns.includes("session_id") ? [
            { session_id: "one", user_agent: "iPhone", created_at: now },
            { session_id: "one", user_agent: "iPhone", created_at: now },
          ] : [], count: table === "page_views" ? 2 : 0, error: null,
        }),
      };
      return chain;
    });
    const response = await GET(new NextRequest("https://example.com/api/stats"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.activeSessions).toBe(1);
    expect(body.data.visitorChart.at(-1)).toMatchObject({ visitors: 1, pageViews: 2 });
    expect(body.data.deviceData[1]).toMatchObject({ count: 1, value: 100 });
    expect(mocks.calls.filter((table) => table === "page_views")).toHaveLength(2);
    expect(mocks.calls).not.toContain("sessions");
  });
});
