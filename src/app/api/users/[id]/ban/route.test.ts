import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-response";

const mocks = vi.hoisted(() => ({
  gate: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  guard: vi.fn(),
  audit: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/admin/admin-gate", () => ({ checkAdminGate: mocks.gate }));

vi.mock("@/lib/admin/session-store", () => ({
  revokeAllUserSessions: mocks.revokeAllUserSessions,
}));

vi.mock("@/lib/admin/audit", () => ({
  withAuditLog: mocks.audit,
}));
vi.mock("@/lib/admin/user-guard", () => ({ assertAdminMutationAllowed: mocks.guard }));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { POST } from "./route";

describe("POST /api/users/[id]/ban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gate.mockResolvedValue({ ok: true, user: {
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      is_admin: true,
    } });
    mocks.revokeAllUserSessions.mockResolvedValue(undefined);
    mocks.guard.mockResolvedValue(null);
    mocks.audit.mockImplementation(async (_entry: unknown, mutate: () => Promise<unknown>) => mutate());
    mocks.select.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "user-9", is_banned: true }, error: null }) });
    mocks.from.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: mocks.select,
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
    expect(mocks.select).toHaveBeenCalledWith(expect.not.stringContaining("password_hash"));
  });
  it("rejects self-ban and the last active administrator", async () => {
    const request = () => new NextRequest("https://app.example/api/users/user-9/ban", { method: "POST", body: JSON.stringify({ reason: "abuse" }) });
    mocks.guard.mockRejectedValueOnce(ApiError.forbidden("Cannot ban or demote your own administrator account")).mockRejectedValueOnce(ApiError.forbidden("Refusing to ban or demote the last active administrator"));
    expect((await POST(request(), { params: Promise.resolve({ id: "user-9" }) })).status).toBe(403);
    expect((await POST(request(), { params: Promise.resolve({ id: "user-9" }) })).status).toBe(403);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("does not mutate when audit creation fails", async () => {
    mocks.audit.mockRejectedValue(new Error("audit failed"));
    const request = new NextRequest("https://app.example/api/users/user-9/ban", { method: "POST", body: JSON.stringify({ reason: "abuse" }) });
    expect((await POST(request, { params: Promise.resolve({ id: "user-9" }) })).status).toBe(500);
    expect(mocks.from).not.toHaveBeenCalled();
  });

});
