import { NextResponse } from "next/server";
import { checkRateLimit, checkRateLimitStrict } from "./rate-limiter";

interface RateLimitPolicy {
  prefix: string;
  limit: number;
  windowSeconds: number;
  mode: "strict" | "fail-open";
}

export const RATE_LIMIT_POLICIES = {
  LOGIN_IP: { prefix: "login:ip:", limit: 30, windowSeconds: 900, mode: "strict" },
  LOGIN_IP_ACCOUNT: { prefix: "login:ip-acct:", limit: 10, windowSeconds: 900, mode: "strict" },
  REGISTER_IP: { prefix: "register:", limit: 10, windowSeconds: 900, mode: "strict" },
  VERIFY_IP: { prefix: "verify:", limit: 10, windowSeconds: 900, mode: "strict" },
  FORGOT_PASSWORD_IP: { prefix: "forgot:", limit: 5, windowSeconds: 900, mode: "strict" },
  FORGOT_PASSWORD_ACCOUNT: { prefix: "forgot:acct:", limit: 3, windowSeconds: 900, mode: "strict" },
  RESET_PASSWORD_IP: { prefix: "reset:", limit: 5, windowSeconds: 900, mode: "strict" },
  HISTORY_WRITE_USER: { prefix: "history:", limit: 200, windowSeconds: 900, mode: "strict" },
  PAGE_VIEW_IP: { prefix: "pageview:", limit: 60, windowSeconds: 60, mode: "fail-open" },
  CHECKOUT_USER: { prefix: "checkout:", limit: 20, windowSeconds: 60, mode: "fail-open" },
  PAYMENT_STATUS_USER: { prefix: "payments-status:", limit: 30, windowSeconds: 60, mode: "strict" },
  ADMIN_CONTROL_IP: { prefix: "admin-control:", limit: 20, windowSeconds: 60, mode: "strict" },
} as const satisfies Record<string, RateLimitPolicy>;

export function consumePolicy(policy: RateLimitPolicy, subject: string) {
  const check = policy.mode === "strict" ? checkRateLimitStrict : checkRateLimit;
  return check(`${policy.prefix}${subject}`, policy.limit, policy.windowSeconds * 1000);
}

export async function enforceRateLimit(
  policy: RateLimitPolicy,
  subject: string,
  options: { throttleStatus?: 400 | 429; throttleMessage?: string; throttleResponse?: () => NextResponse } = {},
) {
  try {
    const quota = await consumePolicy(policy, subject);
    if (quota.allowed) return { ok: true as const };
    if (options.throttleResponse) return { ok: false as const, response: options.throttleResponse() };
    const status = options.throttleStatus ?? 429;
    const error = options.throttleMessage ?? "Too many requests. Please try again later.";
    const headers = status === 429 ? { "Retry-After": String(quota.retryAfter) } : undefined;
    return { ok: false as const, response: NextResponse.json({ success: false, error }, { status, headers }) };
  } catch (error) {
    const code = safeRateLimitErrorCode(error);
    console.error(`[rate-limit] Backend unavailable (${policy.prefix})`, { code });
    return { ok: false as const, response: NextResponse.json(
      { success: false, error: "Rate limit unavailable", code: "SERVICE_UNAVAILABLE" }, { status: 503 },
    ) };
  }
}

export function safeRateLimitErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) return "UNKNOWN";
  const code = error.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : "UNKNOWN";
}
