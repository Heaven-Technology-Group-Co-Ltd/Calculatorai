import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { checkRateLimitStrict } from "./rate-limiter";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("./admin/session-store", () => ({ isSessionValid: vi.fn(async () => true) }));

vi.mock("./rate-limiter", () => ({
  checkRateLimitStrict: vi.fn(async () => ({ allowed: true, remaining: 9, retryAfter: 0 })),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (password: string, _hash: string) => password === "correct_password"),
    hash: vi.fn(async () => "runtime_dummy_hash"),
  },
  compare: vi.fn(async (password: string, _hash: string) => password === "correct_password"),
  hash: vi.fn(async () => "runtime_dummy_hash"),
}));

process.env.SUPABASE_URL = "https://mock.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";
process.env.NEXTAUTH_SECRET = "mock_secret";

import { authOptions } from "./auth-options";

const credentialsProvider = authOptions.providers.find(
  (p: any) => p.id === "credentials" || p.name === "credentials"
) as any;

describe("authOptions.authorize error segregation (F-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for non-existent email (anti-enumeration)", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
        }),
      }),
    });

    const res = await credentialsProvider.options.authorize({
      email: "unknown@example.com",
      password: "any_password",
    });

    expect(res).toBeNull();
    // Timing equalization: the runtime-generated dummy-hash compare must still
    // run so an early return cannot reveal that the address is unknown.
    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
    expect(bcrypt.compare).toHaveBeenCalledWith("any_password", "runtime_dummy_hash");
  });

  it("memoizes timing equalizer hash across consecutive unknown-email calls", async () => {
    vi.resetModules();
    const freshBcrypt = (await import("bcryptjs")).default;
    const { authOptions: freshAuthOptions } = await import("./auth-options");
    const freshProvider = freshAuthOptions.providers.find(
      (p: any) => p.id === "credentials" || p.name === "credentials"
    ) as any;

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
        }),
      }),
    });

    await freshProvider.options.authorize({
      email: "unknown1@example.com",
      password: "any_password",
    });
    await freshProvider.options.authorize({
      email: "unknown2@example.com",
      password: "any_password",
    });

    expect(freshBcrypt.hash).toHaveBeenCalledTimes(1);
    expect(freshBcrypt.compare).toHaveBeenCalledTimes(2);
  });

  it("returns null for wrong password even if account is banned or unverified", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "u1",
              name: "Banned User",
              email: "banned@example.com",
              password_hash: "hash",
              email_verified: null,
              is_banned: true,
            },
            error: null,
          }),
        }),
      }),
    });

    const res = await credentialsProvider.options.authorize({
      email: "banned@example.com",
      password: "wrong_password",
    });

    expect(res).toBeNull();
  });

  it("throws USER_BANNED only when password is correct", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "u1",
              name: "Banned User",
              email: "banned@example.com",
              password_hash: "hash",
              email_verified: new Date().toISOString(),
              is_banned: true,
            },
            error: null,
          }),
        }),
      }),
    });

    await expect(async () => {
      await credentialsProvider.options.authorize({
        email: "banned@example.com",
        password: "correct_password",
      });
    }).rejects.toThrow("USER_BANNED");
  });

  it("throws EMAIL_UNVERIFIED only when password is correct and not banned", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "u2",
              name: "Unverified User",
              email: "unverified@example.com",
              password_hash: "hash",
              email_verified: null,
              is_banned: false,
            },
            error: null,
          }),
        }),
      }),
    });

    await expect(async () => {
      await credentialsProvider.options.authorize({
        email: "unverified@example.com",
        password: "correct_password",
      });
    }).rejects.toThrow("EMAIL_UNVERIFIED");
  });

  it("returns user object when password is correct, verified, and not banned", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "u3",
              name: "Good User",
              email: "good@example.com",
              password_hash: "hash",
              email_verified: new Date().toISOString(),
              is_banned: false,
            },
            error: null,
          }),
        }),
      }),
    });

    const res = await credentialsProvider.options.authorize({
      email: "good@example.com",
      password: "correct_password",
    });

    expect(res).toEqual({
      id: "u3",
      name: "Good User",
      email: "good@example.com",
    });
  });
});


describe("credential rate limiting", () => {
  it("blocks the eleventh attempt with a timing comparison without blocking another IP", async () => {
    const counts = new Map<string, number>();
    vi.mocked(checkRateLimitStrict).mockImplementation(async (key) => {
      const count = (counts.get(key) ?? 0) + 1; counts.set(key, count);
      return { allowed: count <= 10, remaining: 0, retryAfter: 1 };
    });
    const query = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue({ select: () => ({ eq: () => ({ single: query }) }) });
    const credentials = { email: " User@Example.com ", password: "wrong" };
    for (let index = 0; index < 11; index++) await credentialsProvider.options.authorize(credentials, { headers: { "x-forwarded-for": "1.2.3.4" } });
    expect(query).toHaveBeenCalledTimes(10);
    expect(bcrypt.compare).toHaveBeenCalledWith("wrong", "runtime_dummy_hash");
    await credentialsProvider.options.authorize(credentials, { headers: { "x-forwarded-for": "5.6.7.8" } });
    expect(query).toHaveBeenCalledTimes(11);
    expect(checkRateLimitStrict).toHaveBeenCalledWith("login:ip-acct:1.2.3.4:user@example.com", 10, 900000);
  });
});


it("revokes a JWT when its user has been deleted", async () => {
  mockSupabase.from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: "PGRST116" } }) }) }) });
  const callback = authOptions.callbacks?.jwt as unknown as (args: { token: { sub: string; iat: number } }) => Promise<{ revoked?: boolean; sub?: string }>;
  const token = await callback({ token: { sub: "deleted", iat: 1 } });
  expect(token.revoked).toBe(true); expect(token.sub).toBeUndefined();
});
