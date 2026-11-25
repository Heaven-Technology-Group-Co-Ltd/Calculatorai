import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkAdminGate } from "./admin-gate";
import { getToken, type JWT } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { isSessionValid } from "@/lib/admin/session-store";
import { checkRateLimitStrict } from "@/lib/rate-limiter";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/admin/session-store", () => ({
  isSessionValid: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimitStrict: vi.fn(),
}));

describe("checkAdminGate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NEXTAUTH_URL: "https://example.com" };
    vi.mocked(checkRateLimitStrict).mockResolvedValue({
      allowed: true,
      remaining: 59,
      retryAfter: 0,
    });
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    vi.mocked(isSessionValid).mockResolvedValue(true);
    mockDbUser({ id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true });
  });


  function makeRequest(url = "https://example.com/api/test") {
    return new NextRequest(url);
  }

  type MockDbUser = { id: string; name: string | null; email: string | null; is_admin: boolean };
  type MockDbError = { message: string; code: string } | null;

  function mockDbUser(user: MockDbUser | null, error: MockDbError = null) {
    const single = vi.fn().mockResolvedValue({ data: user, error });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    // The SupabaseClient fluent chain is far wider than the mocked slice; the
    // double cast keeps the mock honest without widening to `any`.
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);
  }

  it("returns ok with user when authenticated and is_admin is true", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    vi.mocked(isSessionValid).mockResolvedValue(true);
    mockDbUser({ id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true });

    const req = makeRequest();
    const result = await checkAdminGate(req);

    expect(result).toEqual({
      ok: true,
      user: { id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true },
    });
  });

  it("returns unauthenticated when token is missing", async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const req = makeRequest();
    const resultNoKey = await checkAdminGate(req);
    expect(checkRateLimitStrict).not.toHaveBeenCalled();
    const resultWithKey = await checkAdminGate(req, { rateLimitKey: "admin:9.9.9.9" });

    expect(resultNoKey).toEqual({
      ok: false,
      failure: {
        kind: "unauthenticated",
        status: 401,
        message: "Authentication required",
      },
    });
    expect(resultWithKey).toEqual(resultNoKey);
  });

  it("returns unauthenticated when iat is missing", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1" } as JWT);

    const req = makeRequest();
    const result = await checkAdminGate(req);

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "unauthenticated",
        status: 401,
        message: "Invalid session token",
      },
    });
  });

  it("returns unauthenticated when session is revoked", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    vi.mocked(isSessionValid).mockResolvedValue(false);
    mockDbUser({ id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true });

    const req = makeRequest();
    const result = await checkAdminGate(req);

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "unauthenticated",
        status: 401,
        message: "Session has been revoked",
      },
    });
  });

  it("returns forbidden when user is not admin", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    vi.mocked(isSessionValid).mockResolvedValue(true);
    mockDbUser({ id: "user-1", name: "Normie", email: "normie@example.com", is_admin: false });

    const req = makeRequest();
    const result = await checkAdminGate(req);

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "forbidden",
        status: 403,
        message: "Admin privileges required",
      },
    });
  });

  it("returns rate_limited when rate limit is exhausted", async () => {
    vi.mocked(checkRateLimitStrict).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 30,
    });

    const req = makeRequest();
    const result = await checkAdminGate(req, { rateLimitKey: "admin:1.2.3.4" });

    expect(checkRateLimitStrict).toHaveBeenCalledWith("admin:1.2.3.4", 60, 60_000);
    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "rate_limited",
        status: 429,
        message: "Too many requests. Please try again later.",
      },
    });
  });

  it("returns unavailable when strict rate limiter throws", async () => {
    vi.mocked(checkRateLimitStrict).mockRejectedValue(new Error("Redis down"));

    const req = makeRequest();
    const result = await checkAdminGate(req, { rateLimitKey: "admin:1.2.3.4" });

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "unavailable",
        status: 503,
        message: "Service temporarily unavailable. Please try again shortly.",
      },
    });
  });

  it("returns unavailable when revocation query throws", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    vi.mocked(isSessionValid).mockRejectedValue(new Error("DB connection lost"));
    mockDbUser({ id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true });

    const req = makeRequest();
    const result = await checkAdminGate(req);

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "unavailable",
        status: 503,
        message: "Service temporarily unavailable. Please try again shortly.",
      },
    });
  });

  it("returns unavailable when user lookup query returns DB error", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    vi.mocked(isSessionValid).mockResolvedValue(true);
    mockDbUser(null, { message: "connection timeout", code: "ETIMEDOUT" });

    const req = makeRequest();
    const result = await checkAdminGate(req);

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "unavailable",
        status: 503,
        message: "Service temporarily unavailable. Please try again shortly.",
      },
    });
  });

  it("executes revocation and user lookup in parallel via Promise.all", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);

    let sessionResolve: (v: boolean) => void = () => {};
    const sessionPromise = new Promise<boolean>((resolve) => {
      sessionResolve = resolve;
    });
    vi.mocked(isSessionValid).mockReturnValue(sessionPromise);

    type MockDbResult = { data: MockDbUser | null; error: MockDbError };
    let dbResolve: (result: MockDbResult) => void = () => {};
    const dbPromise = new Promise<MockDbResult>((resolve) => {
      dbResolve = resolve;
    });

    const single = vi.fn().mockReturnValue(dbPromise);
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    // The SupabaseClient fluent chain is far wider than the mocked slice; the
    // double cast keeps the mock honest without widening to `any`.
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseAdmin>);

    const req = makeRequest();
    const gatePromise = checkAdminGate(req);
    await Promise.resolve();

    // Both calls dispatched concurrently before either resolves
    expect(isSessionValid).toHaveBeenCalledWith("user-1", 1000);
    expect(from).toHaveBeenCalledWith("users");

    sessionResolve(true);
    dbResolve({
      data: { id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true },
      error: null,
    });

    const result = await gatePromise;
    expect(result).toEqual({
      ok: true,
      user: { id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true },
    });
  });

  it("returns unauthenticated when the user record does not exist", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: 1000 } as JWT);
    mockDbUser(null, { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" });

    const result = await checkAdminGate(makeRequest());

    expect(result).toEqual({
      ok: false,
      failure: { kind: "unauthenticated", status: 401, message: "Authentication required" },
    });
  });

  it("decodes a fallback session cookie when the primary secure cookie is absent", async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null).mockResolvedValueOnce({
      sub: "user-1",
      iat: 1000,
    } as JWT);

    const result = await checkAdminGate(makeRequest());

    expect(vi.mocked(getToken)).toHaveBeenNthCalledWith(1, expect.objectContaining({ cookieName: "__Secure-next-auth.session-token" }));
    expect(vi.mocked(getToken)).toHaveBeenNthCalledWith(2, expect.objectContaining({ cookieName: "next-auth.session-token" }));
    expect(result).toEqual({
      ok: true,
      user: { id: "user-1", name: "Admin", email: "admin@example.com", is_admin: true },
    });
  });

  it("rejects a non-finite token iat claim", async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: "user-1", iat: Number.POSITIVE_INFINITY } as JWT);

    const result = await checkAdminGate(makeRequest());

    expect(isSessionValid).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      failure: { kind: "unauthenticated", status: 401, message: "Invalid session token" },
    });
  });
});
