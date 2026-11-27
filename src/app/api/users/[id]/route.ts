import { FIELD_LIMITS } from "@/lib/validation/vocabulary";
import { USER_SAFE_SELECT_COLUMNS } from "@/lib/admin/user-columns";
import { assertAdminMutationAllowed } from "@/lib/admin/user-guard";
import { z } from "zod";
import { DB_PLAN_IDS } from "@/lib/plans";
import { NextRequest } from "next/server";
import { withAdmin } from "@/lib/admin/with-admin";
import { successResponse, badRequestResponse } from "@/lib/api-response";

const UserUpdateSchema = z.object({
  name: z.string().max(FIELD_LIMITS.name).nullable().optional(),
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
  return withAdmin(request, async ({ supabase }) => {
    const { id } = await params;
    const { data: user, error } = await supabase.from("users").select(USER_SAFE_SELECT_COLUMNS).eq("id", id).single();
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
  });
}

/**
 * PUT /api/users/[id]
 * Update user fields (name, email, is_admin, is_banned).
 * Admin only.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async ({ admin, supabase, audit }) => {
    const { id } = await params;
    const body = await request.json();
    const parsed = UserUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequestResponse("Invalid user fields");
    const updateData = parsed.data;
    await assertAdminMutationAllowed(admin.id, id, updateData);

    const data = await audit({ action: "update_user", targetType: "user", targetId: id, metadata: updateData }, async () => {
    const { data, error } = await supabase.from("users").update(updateData).eq("id", id).select(USER_SAFE_SELECT_COLUMNS).single();
    if (error) throw new Error(error.message);


      return data;
    });
    return successResponse(data);
  });
}
