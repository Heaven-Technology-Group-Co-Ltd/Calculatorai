import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ strict: vi.fn(), failOpen: vi.fn() }));
vi.mock("./rate-limiter", () => ({ checkRateLimitStrict: mocks.strict, checkRateLimit: mocks.failOpen }));
import { consumePolicy, enforceRateLimit, RATE_LIMIT_POLICIES } from "./rate-limit-policies";

describe("rate limit policies", () => {
  it("retains the production recovery key and strict policy", async () => {
    mocks.strict.mockResolvedValueOnce({ allowed: true });
    await consumePolicy(RATE_LIMIT_POLICIES.FORGOT_PASSWORD_IP, "127.0.0.1");
    expect(mocks.strict).toHaveBeenCalledWith("forgot:127.0.0.1", 5, 900000);
  });

  it("reports retry time for exhausted quotas", async () => {
    mocks.strict.mockResolvedValueOnce({ allowed: false, retryAfter: 12 });
    const gate = await enforceRateLimit(RATE_LIMIT_POLICIES.VERIFY_IP, "127.0.0.1");
    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("Expected a rejected quota");
    expect(gate.response.status).toBe(429);
    expect(gate.response.headers.get("Retry-After")).toBe("12");
  });

  it("does not log identifiers included in backend errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.strict.mockRejectedValueOnce({ code: "23505", message: "identifier user@example.com", details: "127.0.0.1" });
    await enforceRateLimit(RATE_LIMIT_POLICIES.FORGOT_PASSWORD_ACCOUNT, "user@example.com");
    expect(JSON.stringify(log.mock.calls)).not.toContain("user@example.com");
    expect(JSON.stringify(log.mock.calls)).not.toContain("127.0.0.1");
    expect(JSON.stringify(log.mock.calls)).toContain("23505");
    log.mockRestore();
  });

  it("fails closed with 503 when the recovery limiter fails", async () => {
    mocks.strict.mockRejectedValueOnce(new Error("offline"));
    const gate = await enforceRateLimit(RATE_LIMIT_POLICIES.VERIFY_IP, "127.0.0.1");
    expect(gate.ok).toBe(false);
    if (gate.ok) throw new Error("Expected an unavailable quota");
    expect(gate.response.status).toBe(503);
  });
});
