import { describe, expect, it, vi, beforeEach } from "vitest";
import { isSessionValid, revokeAllUserSessions } from "./session-store";
import { getSupabaseAdmin } from "@/lib/supabase-client";

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("isSessionValid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when no revocation record exists (PGRST116)", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);

    await expect(isSessionValid("user-1", 1000)).resolves.toBe(true);
  });

  it("returns false when token was issued before revocation", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { revoked_at: new Date(2_000_000).toISOString() },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);

    // token iat=1000s (1_000_000ms) < revoked 2_000_000ms
    await expect(isSessionValid("user-1", 1000)).resolves.toBe(false);
  });

  it("returns true when token was issued at or after revocation", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { revoked_at: new Date(2_000_000).toISOString() },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);

    // token iat=3000s (3_000_000ms) >= revoked 2_000_000ms
    await expect(isSessionValid("user-1", 3000)).resolves.toBe(true);
  });

  it("throws on non-PGRST116 query errors", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "connection timeout", code: "ETIMEDOUT" },
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);

    await expect(isSessionValid("user-1", 1000)).rejects.toThrow();
  });
});

describe("revokeAllUserSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts only user_id and revoked_at without updated_at", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);

    await revokeAllUserSessions("user-1");

    expect(from).toHaveBeenCalledWith("user_session_revocations");
    expect(upsert).toHaveBeenCalledTimes(1);
    const payload = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["revoked_at", "user_id"]);
    expect(payload).not.toHaveProperty("updated_at");
    expect(payload.user_id).toBe("user-1");
    expect(typeof payload.revoked_at).toBe("string");
  });
});
