import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

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
    const { data: user, error } = await supabase.from("users").select("*").eq("id", id).single();
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
    const allowedFields = ["name", "email", "is_admin", "is_banned"];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const { data, error } = await supabase.from("users").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(error.message);

    void writeAuditLog({ adminUserId: admin.id, action: "update_user", targetType: "user", targetId: id, metadata: updateData });
    return successResponse(data);
  } catch (err) {
    console.error("[User Detail] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
