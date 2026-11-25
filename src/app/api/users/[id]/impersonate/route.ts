/**
 * POST /api/users/[id]/impersonate
 *
 * Creates a temporary session for the target user (admin only).
 * Sets the session token as an httpOnly cookie instead of returning
 * it in the response body.
 *
 * Security:
 *  - requireAdmin() guard
 *  - Token set as httpOnly cookie, NEVER in response body
 *  - Audit log written
 *  - Session expires in 15 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Require admin authentication ───────────────────────────────────
    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch {
      return unauthorizedResponse("Admin access required");
    }

    const { id: targetUserId } = await params;
    const supabase = getSupabaseAdmin();

    // ── Verify target user exists ─────────────────────────────────────
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ── Mint a real NextAuth JWT for the target user ───────────────────
    // The session strategy is jwt, so NextAuth must be able to decode the
    // cookie value — an opaque UUID would decode to null and kill the admin
    // session instead of impersonating.
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return serverErrorResponse("Impersonation unavailable");
    }

    const impersonationToken = await encode({
      token: {
        sub: targetUserId,
        id: targetUserId,
        email: targetUser.email,
        name: targetUser.name,
        impersonatedBy: admin.id,
      },
      secret,
      maxAge: 15 * 60,
    });

    const sessionCookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    // ── Audit log ──────────────────────────────────────────────────────
    void writeAuditLog({
      adminUserId: admin.id,
      action: "impersonate_user",
      targetType: "user",
      targetId: targetUserId,
      metadata: { targetEmail: targetUser.email },
    });

    // ── Set session as httpOnly cookie, never expose in body ──────────
    const response = NextResponse.json(
      successResponse({ message: "Impersonation session created", userId: targetUserId }),
      { status: 200 }
    );

    response.cookies.set(sessionCookieName, impersonationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 900, // 15 minutes in seconds
    });

    return response;
  } catch (err) {
    console.error("[Impersonate] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse("Internal server error");
  }
}
