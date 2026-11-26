import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  writeAuditLog: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/admin/auth-middleware", () => ({
  requireAdmin: mocks.requireAdmin,
  adminGateErrorResponse: () => null,
}));

vi.mock("@/lib/admin/session-store", () => ({
  revokeAllUserSessions: mocks.revokeAllUserSessions,
}));

vi.mock("@/lib/admin/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { POST } from "./route";

describe("POST /api/users/[id]/ban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
    });
    mocks.revokeAllUserSessions.mockResolvedValue(undefined);
    mocks.from.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: { id: "user-9", is_banned: true },
              error: null,
            }),
          }),
        }),
      }),
    });
  });

  it("bans user and immediately revokes all active sessions", async () => {
    const req = new NextRequest("https://app.example/api/users/user-9/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "abuse" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "user-9" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mocks.revokeAllUserSessions).toHaveBeenCalledWith("user-9");
  });
});
