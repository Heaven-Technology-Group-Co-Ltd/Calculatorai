import { describe, expect, it } from "vitest";
import { createBurstLimiter } from "./burst-limiter";

describe("burst limiter", () => {
  it("expires hits at the window boundary and rounds retry time up", () => {
    const take = createBurstLimiter({ max: 1, windowMs: 1500, maxClients: 2 });
    expect(take("a", 0).allowed).toBe(true);
    expect(take("a", 400)).toEqual({ allowed: false, retryAfter: 2 });
    expect(take("a", 1500).allowed).toBe(true);
  });

  it("evicts the least recently used client at the capacity bound", () => {
    const take = createBurstLimiter({ max: 1, windowMs: 10000, maxClients: 2 });
    take("a", 0);
    take("b", 1);
    expect(take("a", 2).allowed).toBe(false);
    take("c", 3);
    expect(take("a", 4).allowed).toBe(false);
    expect(take("b", 5).allowed).toBe(true);
  });
});
