/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a valid reset token.
 *
 * Security:
 *  - Rate limited
 *  - Token consumed after use
 *  - Zod input validation
 *  - bcrypt password hashing
 */

import { NextRequest } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { checkRateLimitStrict } from "@/lib/rate-limiter";
import {
  badRequestResponse,
  successResponse,
  rateLimitedResponse,
  serverErrorResponse,
  serviceUnavailableResponse,
} from "@/lib/api-response";
import { RATE_LIMIT, AUTH } from "@/lib/api-constants";

const ResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(AUTH.MIN_PASSWORD_LENGTH, `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`)
    .max(AUTH.MAX_PASSWORD_LENGTH)
    .refine((password) => new TextEncoder().encode(password).length <= 72, "Password must not exceed 72 UTF-8 bytes"),
});

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ──────────────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const rateResult = await checkRateLimitStrict(`reset:${ip}`, 5, RATE_LIMIT.AUTH.windowMs).catch(() => null);
    if (!rateResult) return serviceUnavailableResponse("Rate limit unavailable");
    if (!rateResult.allowed) {
      return rateLimitedResponse();
    }

    // ── Parse body ─────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return badRequestResponse(`Validation failed: ${issues}`);
    }

    const { token, email, password } = parsed.data;
    const supabase = getSupabaseAdmin();

    // ── Verify token ───────────────────────────────────────────────────
    const { data: vt } = await supabase
      .from("verification_tokens")
      .select("*")
      .eq("identifier", email.toLowerCase())
      .eq("token", token)
      .eq("type", "password_reset")
      .maybeSingle();

    if (!vt) {
      return badRequestResponse("Invalid or expired reset link");
    }

    if (new Date(vt.expires) < new Date()) {
      await supabase.from("verification_tokens").delete()
        .eq("identifier", email.toLowerCase())
        .eq("type", "password_reset");
      return badRequestResponse("Reset link has expired");
    }

    // ── Hash new password ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);

    // ── Update user password ───────────────────────────────────────────
    const { error: updateError, data: updatedUser } = await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("email", email.toLowerCase())
      .select("id")
      .single();

    if (updateError || !updatedUser) {
      console.error("[ResetPassword] Update failed:", updateError?.message);
      return serverErrorResponse("Failed to reset password");
    }

    // ── Consume token (token-scoped: don't invalidate a pending resend) ──
    await supabase.from("verification_tokens").delete()
      .eq("identifier", email.toLowerCase())
      .eq("type", "password_reset")
      .eq("token", token);

    // Revoke all sessions
    await supabase.from("user_session_revocations").upsert({
      user_id: updatedUser.id,
      revoked_at: new Date().toISOString(),
    });

    return successResponse({ message: "Password reset successfully" });
  } catch (err) {
    console.error("[ResetPassword] Error:", err);
    return serverErrorResponse("Internal server error");
  }
}
