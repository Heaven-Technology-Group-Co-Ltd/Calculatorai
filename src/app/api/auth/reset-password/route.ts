import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
import { PASSWORD_POLICY, isWithinPasswordByteLimit } from "@/lib/validation/vocabulary";
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
import { badRequestResponse, successResponse, serverErrorResponse,  } from "@/lib/api-response";
import { AUTH } from "@/lib/api-constants";

const ResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(PASSWORD_POLICY.minChars, `Password must be at least ${PASSWORD_POLICY.minChars} characters`)
    .refine(isWithinPasswordByteLimit, `Password must not exceed ${PASSWORD_POLICY.maxBytes} UTF-8 bytes`),
});

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ──────────────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const quota = await enforceRateLimit(RATE_LIMIT_POLICIES.RESET_PASSWORD_IP, ip);
    if (!quota.ok) return quota.response;

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
