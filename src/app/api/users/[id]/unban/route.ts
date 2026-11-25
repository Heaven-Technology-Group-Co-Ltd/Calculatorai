import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/unban
 * Unban a user account.
 * Admin only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const { id } = await params;
    const { data, error } = await supabase.from("users").update({ is_banned: false, banned_at: null, banned_reason: null }).eq("id", id).select().single();
    if (error) throw new Error(error.message);

    void writeAuditLog({ adminUserId: admin.id, action: "unban_user", targetType: "user", targetId: id });
    return successResponse(data);
  } catch (err) {
    console.error("[Unban User] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
