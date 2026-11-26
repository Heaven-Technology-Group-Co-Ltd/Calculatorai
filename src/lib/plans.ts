/**
 * Single Source of Truth for Plans, Pricing, and Subscription Intervals.
 *
 * Unifies:
 *  - Stripe Checkout tiers (`monthly`, `yearly`, `lifetime`) used by PurchaseClient
 *  - Admin-assignable subscription tiers (`basic`, `pro`, `enterprise`)
 *  - Database `users.plan` / `subscriptions.plan` values (TEXT, default 'free')
 */

export const CHECKOUT_PLAN_IDS = ["monthly", "yearly", "lifetime"] as const;
export type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

export const ADMIN_ASSIGNABLE_PLANS = ["basic", "pro", "enterprise"] as const;
export type AdminAssignablePlan = (typeof ADMIN_ASSIGNABLE_PLANS)[number];

export const DB_PLAN_IDS = [
  "free",
  "basic",
  "pro",
  "enterprise",
  "monthly",
  "yearly",
  "lifetime",
] as const;
export type DbPlanId = (typeof DB_PLAN_IDS)[number];

export type BillingInterval = "month" | "year" | "lifetime";

export interface CheckoutPlan {
  id: CheckoutPlanId;
  dbPlan: DbPlanId;
  product: string;
  amountCents: number;
  amountMonthlyCents: number;
  interval: BillingInterval;
  durationDays: number | null;
}

export const CHECKOUT_PLANS: Record<CheckoutPlanId, CheckoutPlan> = {
  monthly: {
    id: "monthly",
    dbPlan: "monthly",
    product: "Monthly Pro",
    amountCents: 999,
    amountMonthlyCents: 999,
    interval: "month",
    durationDays: 30,
  },
  yearly: {
    id: "yearly",
    dbPlan: "yearly",
    product: "Yearly Premium",
    amountCents: 7999,
    amountMonthlyCents: Math.round(7999 / 12),
    interval: "year",
    durationDays: 365,
  },
  lifetime: {
    id: "lifetime",
    dbPlan: "lifetime",
    product: "Lifetime Access",
    amountCents: 19900,
    amountMonthlyCents: 0,
    interval: "lifetime",
    durationDays: null,
  },
};

export const ADMIN_PLAN_PRICES_CENTS: Record<AdminAssignablePlan, number> = {
  basic: 500,
  pro: 1200,
  enterprise: 3000,
};

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return typeof value === "string" && (CHECKOUT_PLAN_IDS as readonly string[]).includes(value);
}

export function isAdminAssignablePlan(value: unknown): value is AdminAssignablePlan {
  return typeof value === "string" && (ADMIN_ASSIGNABLE_PLANS as readonly string[]).includes(value);
}

export function isValidDbPlan(value: unknown): value is DbPlanId {
  return typeof value === "string" && (DB_PLAN_IDS as readonly string[]).includes(value);
}

export function getCheckoutPlan(planId: CheckoutPlanId): CheckoutPlan {
  return CHECKOUT_PLANS[planId];
}

export function getAdminPlanPriceCents(plan: AdminAssignablePlan): number {
  return ADMIN_PLAN_PRICES_CENTS[plan];
}

export function getCheckoutPlanByAmountCents(amountCents: number): CheckoutPlan | null {
  for (const plan of Object.values(CHECKOUT_PLANS)) {
    if (plan.amountCents === amountCents) {
      return plan;
    }
  }
  return null;
}

export function getCheckoutPlanByProductName(productName: string): CheckoutPlan | null {
  const normalized = productName.trim().toLowerCase();
  for (const plan of Object.values(CHECKOUT_PLANS)) {
    if (plan.product.toLowerCase() === normalized) {
      return plan;
    }
  }
  return null;
}

/**
 * Resolve a CheckoutPlan from Stripe session metadata and/or amount_total.
 */
export function resolveCheckoutPlan(
  metadata?: Record<string, string> | null,
  amountCents?: number | null
): CheckoutPlan | null {
  const metaPlan = metadata?.plan;
  if (isCheckoutPlanId(metaPlan)) {
    return CHECKOUT_PLANS[metaPlan];
  }

  const metaProduct = metadata?.product_name;
  if (typeof metaProduct === "string" && metaProduct.trim().length > 0) {
    const byProduct = getCheckoutPlanByProductName(metaProduct);
    if (byProduct) return byProduct;
  }

  if (typeof amountCents === "number" && Number.isFinite(amountCents)) {
    return getCheckoutPlanByAmountCents(amountCents);
  }

  return null;
}

export interface SubscriptionPeriod {
  startedAt: string;
  expiresAt: string | null;
}

export function computeSubscriptionPeriod(
  planId: CheckoutPlanId,
  startDate: Date = new Date()
): SubscriptionPeriod {
  const plan = CHECKOUT_PLANS[planId];
  const startedAt = startDate.toISOString();

  if (plan.durationDays === null) {
    return { startedAt, expiresAt: null };
  }

  const expiresDate = new Date(startDate.getTime() + plan.durationDays * 86_400_000);
  return {
    startedAt,
    expiresAt: expiresDate.toISOString(),
  };
}
