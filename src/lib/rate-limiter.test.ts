import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, checkRateLimitStrict } from "./rate-limiter";

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const rpc = vi.fn();
  return {
    from, rpc,
    getSupabaseAdmin: vi.fn(() => ({ from, rpc })),
  };
});

vi.mock("./supabase-client", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

describe("rate limiter storage errors", () => {
  const storageError = { code: "ETIMEDOUT", message: "read timeout" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: null, error: storageError });
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

it("uses the atomic RPC when present", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ allowed: true, current_count: 2, reset_at: new Date(Date.now() + 60000).toISOString() }], error: null });
  await expect(checkRateLimitStrict("login:test", 10, 60000)).resolves.toMatchObject({ allowed: true, remaining: 8 });
  expect(mocks.rpc).toHaveBeenCalledWith("consume_rate_limit", { p_identifier: "login:test", p_limit: 10, p_window_ms: 60000 });
});

it("uses the newest legacy row when the RPC is unavailable", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { identifier: "login:test", count: 10, reset_at: new Date(Date.now() + 60000).toISOString() }, error: null });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  await expect(checkRateLimitStrict("login:test", 10, 60000)).resolves.toMatchObject({ allowed: false });
  expect(limit).toHaveBeenCalledWith(1);
  expect(order).toHaveBeenCalledWith("reset_at", { ascending: false });
});
