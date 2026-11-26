import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  encode: vi.fn(),
  decode: vi.fn(),
  writeAuditLog: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/admin/auth-middleware", () => ({
  requireAdmin: mocks.requireAdmin,
  adminGateErrorResponse: () => null,
}));

vi.mock("next-auth/jwt", () => ({
  encode: mocks.encode,
  decode: mocks.decode,
}));

vi.mock("@/lib/admin/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { DELETE, POST } from "./route";

describe("/api/users/[id]/impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "impersonate-test-secret";
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
    });
    mocks.encode.mockResolvedValue("impersonation-jwt-token");
  });

  it("POST stashes original admin token in backup cookie and sets impersonation session cookie", async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "user-2", name: "User Two", email: "user2@example.com" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("https://app.example/api/users/user-2/impersonate", {
      method: "POST",
      headers: {
        cookie: "next-auth.session-token=original-admin-jwt",
      },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(200);
    expect(res.cookies.get("next-auth.session-token")?.value).toBe("impersonation-jwt-token");
    expect(res.cookies.get("calc.admin-backup")?.value).toBe("original-admin-jwt");
  });

  it("DELETE restores original admin session from backup cookie and clears backup cookie", async () => {
    mocks.decode.mockResolvedValue({ sub: "admin-1" });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "admin-1", is_admin: true, is_banned: false },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("https://app.example/api/users/user-2/impersonate", {
      method: "DELETE",
      headers: {
        cookie: "calc.admin-backup=original-admin-jwt; next-auth.session-token=impersonation-jwt-token",
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(res.cookies.get("next-auth.session-token")?.value).toBe("original-admin-jwt");
    expect(res.cookies.get("calc.admin-backup")?.value).toBe("");
  });
});
