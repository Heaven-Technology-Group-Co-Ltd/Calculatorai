import { guardAdminChange } from "@/lib/admin/user-guard";
import { z } from "zod";
import { DB_PLAN_IDS } from "@/lib/plans";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { withAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

const UserUpdateSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  plan: z.enum(DB_PLAN_IDS).optional(),
  is_admin: z.boolean().optional(),
  is_banned: z.boolean().optional(),
}).strict();

/**
 * GET /api/users/[id]
 * Get detailed user profile including subscription, calculations, and sessions.
 * Admin only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const { id } = await params;
    const { data: user, error } = await supabase.from("users").select("id, name, email, image, email_verified, is_admin, is_banned, banned_at, banned_reason, last_active_at, session_version, plan, created_at, updated_at").eq("id", id).single();
    if (error) throw new Error(error.message);

    const { data: sub } = await supabase.from("subscriptions").select("plan, status, amount_monthly").eq("user_id", id).eq("status", "active").limit(1).single();

    const { count: totalCalcs } = await supabase.from("formula_usage").select("*", { count: "exact", head: true }).eq("user_id", id);

    const { data: formulas } = await supabase.from("formula_usage").select("formula_id").eq("user_id", id);
    const fc: Record<string, number> = {};
    for (const r of formulas ?? []) fc[r.formula_id] = (fc[r.formula_id] || 0) + 1;
    const topFormula = Object.entries(fc).sort((a, b) => b[1] - a[1])[0];



    return successResponse({
      ...user,
      subscription: sub ?? null,
      totalCalculations: totalCalcs ?? 0,
      topFormula: topFormula ? { id: topFormula[0], count: topFormula[1] } : null,
      recentSessions: [],
    });
  } catch (err) {
    console.error("[User Detail] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}

/**
 * PUT /api/users/[id]
 * Update user fields (name, email, is_admin, is_banned).
 * Admin only.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const parsed = UserUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequestResponse("Invalid user fields");
    const updateData = parsed.data;
    const guardError = await guardAdminChange(admin.id, id, updateData);
    if (guardError) return forbiddenResponse(guardError);

    const data = await withAuditLog({ adminUserId: admin.id, action: "update_user", targetType: "user", targetId: id, metadata: updateData }, async () => {
    const { data, error } = await supabase.from("users").update(updateData).eq("id", id).select("id, name, email, image, email_verified, is_admin, is_banned, banned_at, banned_reason, last_active_at, session_version, plan, created_at, updated_at").single();
    if (error) throw new Error(error.message);


      return data;
    });
    return successResponse(data);
  } catch (err) {
    console.error("[User Detail] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
