import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (password: string, hash: string) => password === "correct_password"),
  },
  compare: vi.fn(async (password: string, hash: string) => password === "correct_password"),
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
    // Timing equalization: the dummy-hash compare must still run so an early
    // return cannot reveal that the address is unknown.
    expect(bcrypt.compare).toHaveBeenCalled();
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
