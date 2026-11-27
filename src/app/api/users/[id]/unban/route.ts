import { USER_SAFE_SELECT_COLUMNS } from "@/lib/admin/user-columns";
import { withAdmin } from "@/lib/admin/with-admin";
import { NextRequest } from "next/server";
import { restoreUserSessions } from "@/lib/admin/session-store";
import { successResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/unban
 * Unban a user account.
 * Admin only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async ({ supabase, audit }) => {

    const { id } = await params;
    const data = await audit({ action: "unban_user", targetType: "user", targetId: id }, async () => {
    const { data, error } = await supabase.from("users").update({ is_banned: false, banned_at: null, banned_reason: null }).eq("id", id).select(USER_SAFE_SELECT_COLUMNS).single();
    if (error) throw new Error(error.message);

    await restoreUserSessions(id);


      return data;
    });
    return successResponse(data);
  });
}
