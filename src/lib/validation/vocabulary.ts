export const PLANS = ["free", "basic", "pro", "enterprise", "monthly", "yearly", "lifetime"] as const;
export const USER_STATUS_FILTERS = ["all", "active", "paid", "banned"] as const;
export const USER_STATUS_FILTER_LABELS: Record<(typeof USER_STATUS_FILTERS)[number], string> = {
  all: "All", active: "Active", paid: "Paid", banned: "Banned",
};
export const PASSWORD_POLICY = { minChars: 8, maxBytes: 72 } as const;
export const FIELD_LIMITS = {
  name: 100, email: 255, banReason: 500, adminMessage: 2000,
  historyExpression: 1024, historyResult: 4096, pageViewPath: 512, userAgent: 512,
} as const;

export function isWithinPasswordByteLimit(password: string): boolean {
  return new TextEncoder().encode(password).length <= PASSWORD_POLICY.maxBytes;
}
