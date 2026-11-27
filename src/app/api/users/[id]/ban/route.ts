import { USER_SAFE_SELECT_COLUMNS } from "@/lib/admin/user-columns";
import { assertAdminMutationAllowed } from "@/lib/admin/user-guard";
import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/with-admin";
import { BanUserSchema } from "@/lib/admin/schemas";
import { revokeAllUserSessions } from "@/lib/admin/session-store";
import { successResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/ban
 * Ban a user account.
 * Admin only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, {}, async ({ admin, supabase, audit }) => {
    const { id } = await params;
    const body = await request.json();
    const parsed = BanUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    await assertAdminMutationAllowed(admin.id, id, { is_banned: true });

    const data = await audit({ action: "ban_user", targetType: "user", targetId: id, metadata: { reason: parsed.data.reason } }, async () => {
    const { data, error } = await supabase.from("users").update({ is_banned: true, banned_at: new Date().toISOString(), banned_reason: parsed.data.reason ?? null }).eq("id", id).select(USER_SAFE_SELECT_COLUMNS).single();
    if (error) throw new Error(error.message);

    await revokeAllUserSessions(id);


      return data;
    });
    return successResponse(data);
  });
}
