import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { revokeAllUserSessions, restoreUserSessions } from "@/lib/admin/session-store";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/sessions
 * Revoke all sessions for a user (force re-login).
 * Useful when: user is banned, password changed, privilege downgraded.
 * Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const { id } = await params;

    await revokeAllUserSessions(id);

    await writeAuditLog({
      adminUserId: admin.id,
      action: "revoke_sessions",
      targetType: "user",
      targetId: id,
      metadata: { reason: "admin_revoked" },
    });

    return successResponse({ message: "All sessions revoked. User must log in again." });
  } catch (err) {
    console.error("[User Sessions] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}

/**
 * DELETE /api/users/[id]/sessions
 * Restore session validity (undo revocation).
 * Admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const { id } = await params;

    await restoreUserSessions(id);

    await writeAuditLog({
      adminUserId: admin.id,
      action: "restore_sessions",
      targetType: "user",
      targetId: id,
    });

    return successResponse({ message: "Sessions restored." });
  } catch (err) {
    console.error("[User Sessions] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
