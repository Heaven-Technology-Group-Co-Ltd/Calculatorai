import { describe, expect, it } from "vitest";
import {
  CHECKOUT_PLANS,
  computeSubscriptionPeriod,
  getAdminPlanPriceCents,
  getCheckoutPlan,
  getCheckoutPlanByAmountCents,
  getCheckoutPlanByProductName,
  isAdminAssignablePlan,
  isCheckoutPlanId,
  isValidDbPlan,
  resolveCheckoutPlan,
} from "./plans";

describe("plans catalog", () => {
  it("looks up checkout plans with expected cents pricing and dbPlan mapping", () => {
    expect(getCheckoutPlan("monthly")).toMatchObject({
      id: "monthly",
      dbPlan: "monthly",
      amountCents: 999,
      amountMonthlyCents: 999,
      interval: "month",
    });
    expect(getCheckoutPlan("yearly")).toMatchObject({
      id: "yearly",
      dbPlan: "yearly",
      amountCents: 7999,
      amountMonthlyCents: 667,
      interval: "year",
    });
    expect(getCheckoutPlan("lifetime")).toMatchObject({
      id: "lifetime",
      dbPlan: "lifetime",
      amountCents: 19900,
      amountMonthlyCents: 0,
      interval: "lifetime",
    });
  });

  it("resolves checkout plan from metadata.plan, product_name, or amount_total", () => {
    expect(resolveCheckoutPlan({ plan: "yearly" }, 999)).toBe(CHECKOUT_PLANS.yearly);
    expect(resolveCheckoutPlan({ product_name: "Lifetime Access" }, null)).toBe(
      CHECKOUT_PLANS.lifetime
    );
    expect(resolveCheckoutPlan(null, 999)).toBe(CHECKOUT_PLANS.monthly);
    expect(resolveCheckoutPlan(null, 12345)).toBeNull();
    expect(getCheckoutPlanByAmountCents(7999)).toBe(CHECKOUT_PLANS.yearly);
    expect(getCheckoutPlanByProductName("monthly pro")).toBe(CHECKOUT_PLANS.monthly);
  });

  it("computes subscription period accurately for monthly, yearly, and lifetime", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");

    const monthly = computeSubscriptionPeriod("monthly", start);
    expect(monthly.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(monthly.expiresAt).toBe("2026-01-31T00:00:00.000Z");

    const yearly = computeSubscriptionPeriod("yearly", start);
    expect(yearly.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(yearly.expiresAt).toBe("2027-01-01T00:00:00.000Z");

    const lifetime = computeSubscriptionPeriod("lifetime", start);
    expect(lifetime.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(lifetime.expiresAt).toBeNull();
  });

  it("validates checkout, admin-assignable, and DB plan identifiers", () => {
    expect(isCheckoutPlanId("monthly")).toBe(true);
    expect(isCheckoutPlanId("enterprise")).toBe(false);

    expect(isAdminAssignablePlan("basic")).toBe(true);
    expect(isAdminAssignablePlan("pro")).toBe(true);
    expect(isAdminAssignablePlan("enterprise")).toBe(true);
    expect(isAdminAssignablePlan("monthly")).toBe(false);

    expect(getAdminPlanPriceCents("basic")).toBe(500);
    expect(getAdminPlanPriceCents("pro")).toBe(1200);
    expect(getAdminPlanPriceCents("enterprise")).toBe(3000);

    expect(isValidDbPlan("free")).toBe(true);
    expect(isValidDbPlan("monthly")).toBe(true);
    expect(isValidDbPlan("enterprise")).toBe(true);
    expect(isValidDbPlan("invalid_tier")).toBe(false);
  });
});
