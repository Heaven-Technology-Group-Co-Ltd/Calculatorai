import { NextResponse } from "next/server";
import { checkRateLimit, checkRateLimitStrict } from "./rate-limiter";

interface RateLimitPolicy {
  prefix: string;
  limit: number;
  windowSeconds: number;
  mode: "strict" | "fail-open";
  onBackendErrorStatus?: 500 | 503;
}

export const RATE_LIMIT_POLICIES = {
  LOGIN_IP: { prefix: "login:ip:", limit: 30, windowSeconds: 900, mode: "strict" },
  LOGIN_IP_ACCOUNT: { prefix: "login:ip-acct:", limit: 10, windowSeconds: 900, mode: "strict" },
  REGISTER_IP: { prefix: "register:", limit: 10, windowSeconds: 900, mode: "strict", onBackendErrorStatus: 503 },
  VERIFY_IP: { prefix: "verify:", limit: 10, windowSeconds: 900, mode: "strict", onBackendErrorStatus: 503 },
  FORGOT_PASSWORD_IP: { prefix: "forgot:", limit: 5, windowSeconds: 900, mode: "strict", onBackendErrorStatus: 503 },
  FORGOT_PASSWORD_ACCOUNT: { prefix: "forgot:acct:", limit: 3, windowSeconds: 900, mode: "strict", onBackendErrorStatus: 503 },
  RESET_PASSWORD_IP: { prefix: "reset:", limit: 5, windowSeconds: 900, mode: "strict", onBackendErrorStatus: 503 },
  HISTORY_WRITE_USER: { prefix: "history:", limit: 200, windowSeconds: 900, mode: "strict", onBackendErrorStatus: 500 },
  PAGE_VIEW_IP: { prefix: "pageview:", limit: 60, windowSeconds: 60, mode: "fail-open" },
  CHECKOUT_USER: { prefix: "checkout:", limit: 20, windowSeconds: 60, mode: "fail-open" },
  PAYMENT_STATUS_USER: { prefix: "payments-status:", limit: 30, windowSeconds: 60, mode: "strict", onBackendErrorStatus: 500 },
  ADMIN_CONTROL_IP: { prefix: "admin-control:", limit: 20, windowSeconds: 60, mode: "strict", onBackendErrorStatus: 503 },
} as const satisfies Record<string, RateLimitPolicy>;

export function consumePolicy(policy: RateLimitPolicy, subject: string) {
  const check = policy.mode === "strict" ? checkRateLimitStrict : checkRateLimit;
  return check(`${policy.prefix}${subject}`, policy.limit, policy.windowSeconds * 1000);
}

export async function enforceRateLimit(policy: RateLimitPolicy, subject: string) {
  try {
    const quota = await consumePolicy(policy, subject);
    if (quota.allowed) return { ok: true as const };
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Too many requests" }, {
      status: 429, headers: { "Retry-After": String(quota.retryAfter) },
    }) };
  } catch {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Rate limit unavailable" }, {
      status: policy.onBackendErrorStatus ?? 500,
    }) };
  }
}
