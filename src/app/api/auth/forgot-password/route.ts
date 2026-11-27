import { consumePolicy, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token and sends a reset email.
 * Uses the existing verification_tokens table for storage.
 *
 * Security:
 *  - Rate limited (5 attempts per 15 min per IP)
 *  - Always returns success (no user enumeration)
 *  - Token expires in 1 hour
 */

import { NextRequest } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { z } from "zod";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import {
  badRequestResponse,
  successResponse,
  rateLimitedResponse,
  serverErrorResponse,
  serviceUnavailableResponse,
} from "@/lib/api-response";

const ForgotSchema = z.object({
  email: z.string().email("Invalid email format"),
});

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ──────────────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const rateResult = await consumePolicy(RATE_LIMIT_POLICIES.FORGOT_PASSWORD_IP, ip).catch(() => null);
    if (!rateResult) return serviceUnavailableResponse("Rate limit unavailable");
    if (!rateResult.allowed) {
      return rateLimitedResponse(undefined, rateResult.retryAfter);
    }

    // ── Parse body ─────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = ForgotSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0].message);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const accountGate = await consumePolicy(RATE_LIMIT_POLICIES.FORGOT_PASSWORD_ACCOUNT, email).catch(() => null);
    if (!accountGate) return serviceUnavailableResponse("Rate limit unavailable");
    if (!accountGate.allowed) {
      return successResponse({ message: "If the email exists, a reset link has been sent" });
    }
    const supabase = getSupabaseAdmin();

    // ── Check user exists (silent fail → no enumeration) ───────────────
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // Always return success (prevents email enumeration)
    if (!user) {
      return successResponse({ message: "If the email exists, a reset link has been sent" });
    }

    // ── Generate reset token (valid 1 hour) ────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Clean old tokens then insert new one
    await supabase.from("verification_tokens").delete().eq("identifier", email).eq("type", "password_reset");
    await supabase.from("verification_tokens").insert({
      identifier: email.toLowerCase(),
      token,
      expires: expiresAt,
      type: "password_reset",
    });

    // ── Send reset email ───────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM ?? `"Premium Math Calculator" <noreply@${new URL(baseUrl).hostname}>`,
        to: email,
        subject: "Reset your password — Premium Math Calculator",
        html: `
          <div style="max-width: 480px; margin:0 auto; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="background:#1B272C; padding:32px; border-radius:12px 12px 0 0;">
              <h1 style="color:#E8B896; margin:0; font-size:24px;">Reset Your Password</h1>
            </div>
            <div style="background:#242F35; padding:32px; border-radius:0 0 12px 12px;">
              <p style="color:#F2E6DA; font-size:16px; margin:0 0 24px;">
                Click the button below to reset your password. This link expires in 1 hour.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block; background:#E8B896; color:#1B272C; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
                Reset Password
              </a>
              <p style="color:#8A9FA8; font-size:13px; margin-top:24px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[ForgotPassword] Email send failed:", emailErr);
    }

    return successResponse({ message: "If the email exists, a reset link has been sent" });
  } catch (err) {
    console.error("[ForgotPassword] Error:", err);
    return serverErrorResponse("Internal server error");
  }
}
