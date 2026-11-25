import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, checkRateLimitStrict } from "./rate-limiter";

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  return {
    from,
    getSupabaseAdmin: vi.fn(() => ({ from })),
  };
});

vi.mock("./supabase-client", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

describe("rate limiter storage errors", () => {
  const storageError = { code: "ETIMEDOUT", message: "read timeout" };

  beforeEach(() => {
    vi.clearAllMocks();
    const single = vi.fn().mockResolvedValue({ data: null, error: storageError });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ select, upsert });
  });

  it("strict rate limiting propagates read failures instead of resetting the counter", async () => {
    await expect(checkRateLimitStrict("admin:1.2.3.4", 60, 60_000)).rejects.toBe(storageError);
  });

  it("legacy rate limiting stays fail-open on read failures", async () => {
    await expect(checkRateLimit("api:1.2.3.4", 10, 60_000)).resolves.toEqual({
      allowed: true,
      remaining: 10,
      retryAfter: 0,
    });
  });
});
