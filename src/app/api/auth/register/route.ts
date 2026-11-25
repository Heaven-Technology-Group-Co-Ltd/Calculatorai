/**
 * POST /api/auth/register
 *
 * Creates a new user account, hashes the password with bcrypt,
 * and sends a verification email via SMTP.
 *
 * Security:
 *  - Rate limited (10 attempts per 15 min per IP)
 *  - Zod input validation
 *  - bcrypt password hashing (cost 12)
 *  - Unique email constraint enforced at DB level
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { checkRateLimitStrict } from "@/lib/rate-limiter";
import {
  badRequestResponse,
  rateLimitedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { AUTH, RATE_LIMIT } from "@/lib/api-constants";

// ── Zod schema ──────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name: z.string().max(100).optional().default(""),
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(AUTH.MIN_PASSWORD_LENGTH, `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`)
    .max(AUTH.MAX_PASSWORD_LENGTH, `Password must be at most ${AUTH.MAX_PASSWORD_LENGTH} characters`),
});

// ── SMTP transport (lazy singleton) ─────────────────────────────────────────
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
    // ── Rate limiting (by IP) ─────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const rateResult = await checkRateLimitStrict(
      `register:${ip}`,
      RATE_LIMIT.AUTH.limit,
      RATE_LIMIT.AUTH.windowMs
    );
    if (!rateResult.allowed) {
      return rateLimitedResponse("Too many registration attempts. Please try again later.");
    }

    // ── Parse & validate body ─────────────────────────────────────────
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return badRequestResponse(`Validation failed: ${issues}`);
    }

    const { name, email, password } = parsed.data;
    const supabase = getSupabaseAdmin();

    // ── Check for existing user ───────────────────────────────────────
    const { data: existing } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // ── Token + email is shared by first-time and unverified-resend paths ──
    async function issueVerificationEmail(userEmail: string, userName: string): Promise<void> {
      const supabase = getSupabaseAdmin();
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + AUTH.VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
      ).toISOString();

      await supabase.from("verification_tokens").upsert({
        identifier: userEmail,
        token,
        expires: expiresAt,
        type: "email_verify",
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const verifyUrl = `${baseUrl}/verify?token=${token}&email=${encodeURIComponent(userEmail)}`;
      const safeName = userName
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      await getTransporter().sendMail({
        from: process.env.SMTP_FROM ?? `"Premium Math Calculator" <noreply@${new URL(baseUrl).hostname}>`,
        to: userEmail,
        subject: "Verify your email — Premium Math Calculator",
        html: `
          <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="background: #1B272C; padding: 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #E8B896; margin: 0; font-size: 24px;">Premium Math Calculator</h1>
            </div>
            <div style="background: #242F35; padding: 32px; border-radius: 0 0 12px 12px;">
              <p style="color: #F2E6DA; font-size: 16px; margin: 0 0 24px;">
                Welcome${userName ? `, <strong>${safeName}</strong>,` : ""}! Please verify your email address by clicking the button below.
              </p>
              <a href="${verifyUrl}"
                 style="display: inline-block; background: #E8B896; color: #1B272C; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Verify Email
              </a>
              <p style="color: #8A9FA8; font-size: 13px; margin-top: 24px;">
                This link expires in ${AUTH.VERIFICATION_TOKEN_EXPIRY_HOURS} hours.<br>
                If you didn't create an account, you can ignore this email.
              </p>
            </div>
          </div>
        `,
      });
    }

    // ── Existing accounts must not be enumerable via the response ──────
    if (existing) {
      // Burn the same bcrypt cost a new-account request spends so response
      // timing does not reveal that the address is already registered.
      await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);
      if (!existing.email_verified) {
        // Unverified: refresh the token and resend the verification email.
        try {
          await issueVerificationEmail(email.toLowerCase(), name);
        } catch (emailErr) {
          console.error("[Register] Failed to resend verification email:", emailErr);
        }
      }
      // Verified: reply identically and send nothing. (Residual tell: no mail
      // arrives for an already-active address — accepted; never say "exists".)
      return NextResponse.json({
        success: true,
        message: "Verification email sent",
      });
    }

    // ── Hash password ─────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);

    // ── Create user ───────────────────────────────────────────────────
    const { error: insertError } = await supabase.from("users").insert({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
    });

    if (insertError) {
      console.error("[Register] DB insert error:", insertError.message);
      return serverErrorResponse("Registration failed. Please try again later.");
    }

    // ── Create verification token + send the email ────────────────────
    try {
      await issueVerificationEmail(email.toLowerCase(), name);
    } catch (emailErr) {
      console.error("[Register] Failed to send verification email:", emailErr);
      // User created, email failed — still return success but log it
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (err) {
    console.error("[Register] Unexpected error:", err);
    return serverErrorResponse("Internal server error");
  }
}
