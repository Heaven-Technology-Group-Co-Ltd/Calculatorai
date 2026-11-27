import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ update: vi.fn(), audit: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: vi.fn().mockResolvedValue({ ok: true, user: { id: "admin", is_admin: true } }) }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/admin/audit", () => ({ withAuditLog: mocks.audit }));
import { PUT } from "./route";

describe("administrator profile changes", () => {
  it("updates name and plan without treating the last administrator as removed", async () => {
    mocks.audit.mockImplementation(async (_entry, effect) => effect());
    mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: "target" }, error: null }) }) }) });
    mocks.from.mockReturnValue({ update: mocks.update });
    const request = new NextRequest("https://example.com/api/users/target", {
      method: "PUT", body: JSON.stringify({ name: "Updated", plan: "pro" }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: "target" }) });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ name: "Updated", plan: "pro" });
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ adminUserId: "admin" }), expect.any(Function));
  });
});
