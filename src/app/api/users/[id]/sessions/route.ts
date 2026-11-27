import { NextRequest } from "next/server";
import { withAdmin } from "@/lib/admin/with-admin";
import { revokeAllUserSessions, restoreUserSessions } from "@/lib/admin/session-store";
import { successResponse } from "@/lib/api-response";

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
  return withAdmin(request, async ({ audit }) => {

    const { id } = await params;

    await audit({
      action: "revoke_sessions",
      targetType: "user",
      targetId: id,
      metadata: { reason: "admin_revoked" },
    }, () => revokeAllUserSessions(id));

    return successResponse({ message: "All sessions revoked. User must log in again." });
  });
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
  return withAdmin(request, async ({ audit }) => {

    const { id } = await params;

    await audit({
      action: "restore_sessions",
      targetType: "user",
      targetId: id,
    }, () => restoreUserSessions(id));

    return successResponse({ message: "Sessions restored." });
  });
}
