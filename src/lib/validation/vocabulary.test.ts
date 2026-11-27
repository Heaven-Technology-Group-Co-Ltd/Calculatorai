import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FIELD_LIMITS, isWithinPasswordByteLimit, PASSWORD_POLICY, PLANS, USER_STATUS_FILTERS } from "./vocabulary";

describe("shared validation vocabulary", () => {
  it("enforces UTF-8 byte boundaries", () => {
    expect(isWithinPasswordByteLimit("a".repeat(72))).toBe(true);
    expect(isWithinPasswordByteLimit("a".repeat(73))).toBe(false);
    expect(isWithinPasswordByteLimit("ก".repeat(24))).toBe(true);
    expect(isWithinPasswordByteLimit("ก".repeat(25))).toBe(false);
  });

  it("defines the minimum password length and byte ceiling", () => {
    expect(PASSWORD_POLICY).toEqual({ minChars: 8, maxBytes: 72 });
    expect(z.string().min(PASSWORD_POLICY.minChars).safeParse("1234567").success).toBe(false);
  });

  it("defines supported plans, filters and field limits", () => {
    expect(PLANS).toEqual(["free", "basic", "pro", "enterprise", "monthly", "yearly", "lifetime"]);
    expect(USER_STATUS_FILTERS).toEqual(["all", "active", "paid", "banned"]);
    expect(USER_STATUS_FILTERS).not.toContain("suspended");
    expect(FIELD_LIMITS).toEqual({ name: 100, email: 255, banReason: 500, adminMessage: 2000, historyExpression: 1024, historyResult: 4096, pageViewPath: 512, userAgent: 512 });
  });
});
