import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { RATE_LIMIT } from "@/lib/api-constants";
import { checkRateLimitStrict } from "@/lib/rate-limiter";
import { isSessionValid } from "@/lib/admin/session-store";
import type { AdminUser } from "@/lib/admin/auth-middleware";

export type AdminGateFailure =
  | { kind: "unauthenticated"; status: 401; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "rate_limited"; status: 429; message: string }
  | { kind: "unavailable"; status: 503; message: string };

export type AdminGateResult =
  | { ok: true; user: AdminUser }
  | { ok: false; failure: AdminGateFailure };

const FAILURES = {
  unauthenticated: (message: string): AdminGateFailure => ({
    kind: "unauthenticated",
    status: 401,
    message,
  }),
  forbidden: (message: string): AdminGateFailure => ({
    kind: "forbidden",
    status: 403,
    message,
  }),
  rateLimited: (): AdminGateFailure => ({
    kind: "rate_limited",
    status: 429,
    message: "Too many requests. Please try again later.",
  }),
  unavailable: (): AdminGateFailure => ({
    kind: "unavailable",
    status: 503,
    message: "Service temporarily unavailable. Please try again shortly.",
  }),
} as const;

function failure(failure: AdminGateFailure): AdminGateResult {
  return { ok: false, failure };
}

export async function checkAdminGate(
  request: NextRequest,
  options: { rateLimitKey?: string } = {}
): Promise<AdminGateResult> {
  if (options.rateLimitKey) {
    try {
      const limit = await checkRateLimitStrict(
        options.rateLimitKey,
        RATE_LIMIT.ADMIN.limit,
        RATE_LIMIT.ADMIN.windowMs
      );
      if (!limit.allowed) return failure(FAILURES.rateLimited());
    } catch {
      return failure(FAILURES.unavailable());
    }
  }

  const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  let decoded;
  try {
    decoded = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName,
    });

    if (!decoded) {
      const fallbackName = isSecure
        ? "next-auth.session-token"
        : "__Secure-next-auth.session-token";
      decoded = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: fallbackName,
      });
    }
  } catch {
    return failure(FAILURES.unauthenticated("Authentication required"));
  }

  if (!decoded?.sub) {
    return failure(FAILURES.unauthenticated("Authentication required"));
  }

  const tokenIat = decoded.iat;
  if (typeof tokenIat !== "number" || !Number.isFinite(tokenIat) || tokenIat <= 0) {
    return failure(FAILURES.unauthenticated("Invalid session token"));
  }

  let sessionValid: boolean;
  let user: AdminUser | null;
  try {
    const supabase = getSupabaseAdmin();
    const [isValid, userResult] = await Promise.all([
      isSessionValid(decoded.sub, tokenIat),
      supabase
        .from("users")
        .select("id, name, email, is_admin")
        .eq("id", decoded.sub)
        .single(),
    ]);

    // PGRST116 = no row (deleted user); any other query error = dependency failure.
    if (userResult.error && userResult.error.code !== "PGRST116") {
      return failure(FAILURES.unavailable());
    }
    sessionValid = isValid;
    user = userResult.data;
  } catch {
    return failure(FAILURES.unavailable());
  }

  if (!sessionValid) {
    return failure(FAILURES.unauthenticated("Session has been revoked"));
  }
  if (!user) {
    return failure(FAILURES.unauthenticated("Authentication required"));
  }
  if (user.is_admin !== true) {
    return failure(FAILURES.forbidden("Admin privileges required"));
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
    },
  };
}
