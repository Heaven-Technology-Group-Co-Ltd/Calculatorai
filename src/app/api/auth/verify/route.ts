import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
/**
 * POST /api/auth/verify
 *
 * Verifies a user's email address using a one-time token.
 *
 * Security:
 *  - Rate limited (10 attempts per 15 min per IP)
 *  - Zod input validation
 *  - Token consumed after use (idempotent)
 *  - Expired tokens rejected
 */

import { NextRequest } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { badRequestResponse, successResponse, serverErrorResponse,  } from "@/lib/api-response";

// ── Zod schema ──────────────────────────────────────────────────────────────
const VerifySchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email("Invalid email format"),
});

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting (by IP) ─────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const quota = await enforceRateLimit(RATE_LIMIT_POLICIES.VERIFY_IP, ip);
    if (!quota.ok) return quota.response;

    // ── Parse & validate body ─────────────────────────────────────────
    const body = await request.json();
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return badRequestResponse(`Validation failed: ${issues}`);
    }

    const { token, email } = parsed.data;
    const supabase = getSupabaseAdmin();

    // ── Look up verification token ─────────────────────────────────────
    const { data: vt, error: vtError } = await supabase
      .from("verification_tokens")
      .select("*")
      .eq("identifier", email.toLowerCase())
      .eq("token", token)
      .eq("type", "email_verify")
      .maybeSingle();

    if (vtError || !vt) {
      return badRequestResponse("Invalid or expired verification link");
    }

    // ── Check expiry ──────────────────────────────────────────────────
    if (new Date(vt.expires) < new Date()) {
      // Clean up expired token
      await supabase
        .from("verification_tokens")
        .delete()
        .eq("identifier", email.toLowerCase())
        .eq("type", "email_verify");
      return badRequestResponse("Verification link has expired");
    }

    // ── Update user email_verified ──────────────────────────────────────
    const { error: updateError } = await supabase
      .from("users")
      .update({ email_verified: new Date().toISOString() })
      .eq("email", email.toLowerCase());

    if (updateError) {
      console.error("[Verify] Failed to update user:", updateError.message);
      return serverErrorResponse("Failed to verify email");
    }

    // ── Consume token (token-scoped: don't invalidate a pending resend) ──
    await supabase
      .from("verification_tokens")
      .delete()
      .eq("identifier", email.toLowerCase())
      .eq("type", "email_verify")
      .eq("token", token);

    return successResponse({ message: "Email verified successfully" });
  } catch (err) {
    console.error("[Verify] Unexpected error:", err);
    return serverErrorResponse("Internal server error");
  }
}
