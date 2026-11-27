import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ from: vi.fn(), guard: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/admin/auth-middleware", () => ({ requireAdmin: mocks.admin, adminGateErrorResponse: () => null }));
vi.mock("@/lib/admin/user-guard", () => ({ guardAdminChange: mocks.guard }));
vi.mock("@/lib/admin/audit", () => ({ withAuditLog: async (_entry: unknown, mutate: () => Promise<unknown>) => mutate() }));
import { GET, PUT } from "./route";
const params = { params: Promise.resolve({ id: "target" }) };
function put(body: unknown) { return new NextRequest("https://example.com/api/users/target", { method: "PUT", body: JSON.stringify(body) }); }
describe("user detail security", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.admin.mockResolvedValue({ id: "admin" }); mocks.guard.mockResolvedValue(null); });
  it("rejects unknown fields", async () => { expect((await PUT(put({ password_hash: "secret" }), params)).status).toBe(400); });
  it("rejects self-ban and last-admin demotion through the shared guard", async () => {
    mocks.guard.mockResolvedValueOnce("Cannot ban or demote your own administrator account").mockResolvedValueOnce("Refusing to ban or demote the last active administrator");
    expect((await PUT(put({ is_banned: true }), params)).status).toBe(403);
    expect((await PUT(put({ is_admin: false }), params)).status).toBe(403);
  });
  it("uses a projection that excludes password_hash", async () => {
    const selections: string[] = [];
    mocks.from.mockImplementation((table: string) => ({ select: (columns: string) => {
      selections.push(columns); if (table === "users") return { eq: () => ({ single: async () => ({ data: { id: "target", email: "user@example.com" }, error: null }) }) };
      if (table === "subscriptions") return { eq: () => ({ eq: () => ({ limit: () => ({ single: async () => ({ data: null }) }) }) }) };
      return { eq: async () => ({ data: [], count: 0 }) };
    } }));
    const response = await GET(new NextRequest("https://example.com/api/users/target"), params);
    expect(response.status).toBe(200); expect(selections[0]).not.toContain("password_hash"); expect(await response.text()).not.toContain("password_hash");
  });
});
