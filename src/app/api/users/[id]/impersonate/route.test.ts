import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  decode: vi.fn(),
  encode: vi.fn(),
  isSessionValid: vi.fn(),
  from: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  decode: mocks.decode,
  encode: mocks.encode,
}));

vi.mock("@/lib/admin/session-store", () => ({
  isSessionValid: mocks.isSessionValid,
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

vi.mock("@/lib/session-cookie", () => ({
  getAdminBackupCookieName: () => "next-auth.admin-backup",
  getSessionCookieName: () => "next-auth.session-token",
}));

import { DELETE } from "./route";

describe("DELETE /api/users/[id]/impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
    mocks.decode.mockResolvedValue({ sub: "admin-1", iat: 1000 });
    mocks.isSessionValid.mockResolvedValue(true);
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
  });

  it("rejects a revoked backup admin session with 401 when isSessionValid returns false", async () => {
    mocks.isSessionValid.mockResolvedValue(false);

    const req = new NextRequest("https://app.example/api/users/user-9/impersonate", {
      method: "DELETE",
      headers: {
        cookie: "next-auth.admin-backup=backup-jwt-token",
      },
    });

    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(mocks.isSessionValid).toHaveBeenCalledWith("admin-1", 1000);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when isSessionValid throws a database error", async () => {
    mocks.isSessionValid.mockRejectedValue(new Error("db connection failed"));

    const req = new NextRequest("https://app.example/api/users/user-9/impersonate", {
      method: "DELETE",
      headers: {
        cookie: "next-auth.admin-backup=backup-jwt-token",
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(503);
  });

  it("restores admin session with 200 when backup session is valid and not revoked", async () => {
    const req = new NextRequest("https://app.example/api/users/user-9/impersonate", {
      method: "DELETE",
      headers: {
        cookie: "next-auth.admin-backup=backup-jwt-token",
      },
    });

    const res = await DELETE(req);

    expect(res.status).toBe(200);
    expect(res.cookies.get("next-auth.session-token")?.value).toBe("backup-jwt-token");
    expect(mocks.isSessionValid).toHaveBeenCalledWith("admin-1", 1000);
  });
});
