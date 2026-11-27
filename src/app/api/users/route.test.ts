import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: vi.fn().mockResolvedValue({ ok: true, user: { id: "admin", is_admin: true } }) }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({}) }));
import { GET } from "./route";

describe("user list contract", () => {
  it("preserves the existing error response for invalid filters", async () => {
    const response = await GET(new NextRequest("https://example.com/api/users?filter=invalid"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: "Internal server error" });
  });
});
