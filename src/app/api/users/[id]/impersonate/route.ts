/**
 * POST /api/users/[id]/impersonate
 * DELETE /api/users/[id]/impersonate
 *
 * POST: Creates a temporary impersonation session for the target user (admin only)
 * while stashing the original admin session token in an HttpOnly backup cookie
 * so the admin's own session is never irreversibly destroyed.
 *
 * DELETE: Restores the original admin session from the backup cookie and clears
 * the backup cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { isSessionValid } from "@/lib/admin/session-store";
import { writeAuditLog } from "@/lib/admin/audit";
import { getAdminBackupCookieName, getSessionCookieName } from "@/lib/session-cookie";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api-response";

const IMPERSONATION_TTL_SECONDS = 15 * 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (err) {
      return adminGateErrorResponse(err) ?? unauthorizedResponse("Admin access required");
    }

    const { id: targetUserId } = await params;
    const supabase = getSupabaseAdmin();

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

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return serverErrorResponse("Impersonation unavailable");
    }

    const sessionCookieName = getSessionCookieName();
    const backupCookieName = getAdminBackupCookieName();
    const originalAdminToken = request.cookies.get(sessionCookieName)?.value;

    const impersonationToken = await encode({
      token: {
        sub: targetUserId,
        id: targetUserId,
        email: targetUser.email,
        name: targetUser.name,
        impersonatedBy: admin.id,
      },
      secret,
      maxAge: IMPERSONATION_TTL_SECONDS,
    });

    await writeAuditLog({
      adminUserId: admin.id,
      action: "impersonate_user",
      targetType: "user",
      targetId: targetUserId,
      metadata: { targetEmail: targetUser.email },
    });

    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.json(
      successResponse({ message: "Impersonation session created", userId: targetUserId }),
      { status: 200 }
    );

    if (originalAdminToken) {
      response.cookies.set(backupCookieName, originalAdminToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: IMPERSONATION_TTL_SECONDS,
      });
    }

    response.cookies.set(sessionCookieName, impersonationToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: IMPERSONATION_TTL_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("[Impersonate] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse("Internal server error");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return serverErrorResponse("Impersonation unavailable");
    }

    const sessionCookieName = getSessionCookieName();
    const backupCookieName = getAdminBackupCookieName();
    const backupToken = request.cookies.get(backupCookieName)?.value;

    if (!backupToken) {
      return unauthorizedResponse("No admin backup session found");
    }

    const decoded = await decode({ token: backupToken, secret });
    if (!decoded?.sub || decoded.impersonatedBy) {
      return unauthorizedResponse("Invalid admin backup session");
    }

    const iat = typeof decoded.iat === "number" && Number.isFinite(decoded.iat) ? decoded.iat : 0;
    let sessionValid: boolean;
    try {
      sessionValid = await isSessionValid(decoded.sub, iat);
    } catch {
      return NextResponse.json(
        { success: false, error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    if (!sessionValid) {
      const revokedRes = unauthorizedResponse("Admin backup session has been revoked");
      revokedRes.cookies.delete(backupCookieName);
      return revokedRes;
    }

    const supabase = getSupabaseAdmin();
    const { data: adminUser, error } = await supabase
      .from("users")
      .select("id, is_admin, is_banned")
      .eq("id", decoded.sub)
      .single();

    if (error || !adminUser || adminUser.is_admin !== true || adminUser.is_banned === true) {
      return forbiddenResponse("Admin privileges required");
    }

    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.json(
      successResponse({ message: "Admin session restored", adminId: adminUser.id }),
      { status: 200 }
    );

    response.cookies.set(sessionCookieName, backupToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60,
    });
    response.cookies.delete(backupCookieName);

    return response;
  } catch (err) {
    console.error("[Impersonate Restore] Error:", err);
    return serverErrorResponse("Internal server error");
  }
}
