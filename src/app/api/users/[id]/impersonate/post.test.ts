import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ claim: vi.fn() }));
vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: vi.fn().mockResolvedValue({ ok: true, user: { id: "admin", is_admin: true } }) }));
vi.mock("next-auth/jwt", () => ({ encode: vi.fn().mockResolvedValue("token"), decode: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: (table: string) => {
  if (table === "admin_audit_log") return { insert: mocks.claim };
  return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: "target", email: "target@example.com", name: "Target" }, error: null }) }) }) };
} }) }));
import { POST } from "./route";

describe("impersonation audit", () => {
  it("does not set a session cookie if the audit claim fails", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    try {
      mocks.claim.mockReturnValueOnce({ select: () => ({ single: async () => ({ data: null, error: { message: "audit unavailable" } }) }) });
      const response = await POST(new NextRequest("https://example.com/api/users/target/impersonate", { method: "POST" }), { params: Promise.resolve({ id: "target" }) });
      expect(response.status).toBe(500);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(mocks.claim).toHaveBeenCalledWith(expect.objectContaining({ admin_user_id: "admin", action: "impersonate_user" }));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
