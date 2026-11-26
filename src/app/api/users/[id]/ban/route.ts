import { guardAdminChange } from "@/lib/admin/user-guard";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { BanUserSchema } from "@/lib/admin/schemas";
import { withAuditLog } from "@/lib/admin/audit";
import { revokeAllUserSessions } from "@/lib/admin/session-store";
import { successResponse, forbiddenResponse, serverErrorResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/ban
 * Ban a user account.
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
    const body = await request.json();
    const parsed = BanUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const guardError = await guardAdminChange(admin.id, id, { is_banned: true });
    if (guardError) return forbiddenResponse(guardError);

    const data = await withAuditLog({ adminUserId: admin.id, action: "ban_user", targetType: "user", targetId: id, metadata: { reason: parsed.data.reason } }, async () => {
    const { data, error } = await supabase.from("users").update({ is_banned: true, banned_at: new Date().toISOString(), banned_reason: parsed.data.reason ?? null }).eq("id", id).select().single();
    if (error) throw new Error(error.message);

    await revokeAllUserSessions(id);


      return data;
    });
    return successResponse(data);
  } catch (err) {
    console.error("[Ban User] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
