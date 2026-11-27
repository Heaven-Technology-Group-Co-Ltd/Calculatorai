import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ audit: vi.fn() }));
vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: vi.fn().mockResolvedValue({ ok: true, user: { id: "admin", is_admin: true } }) }));
vi.mock("@/lib/admin/audit", () => ({ withAuditLog: mocks.audit }));
vi.mock("next-auth/jwt", () => ({ encode: vi.fn().mockResolvedValue("token"), decode: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: "target", email: "target@example.com", name: "Target" }, error: null }) }) }) }) }) }));
import { POST } from "./route";

describe("impersonation audit", () => {
  it("does not set a session cookie if the audit claim fails", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    try {
      mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"));
      const response = await POST(new NextRequest("https://example.com/api/users/target/impersonate", { method: "POST" }), { params: Promise.resolve({ id: "target" }) });
      expect(response.status).toBe(500);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ adminUserId: "admin", action: "impersonate_user" }), expect.any(Function));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
