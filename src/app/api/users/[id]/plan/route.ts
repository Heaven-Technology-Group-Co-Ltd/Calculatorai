import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { ChangePlanSchema } from "@/lib/admin/schemas";
import { writeAuditLog } from "@/lib/admin/audit";
import { getAdminPlanPriceCents } from "@/lib/plans";
import { successResponse, forbiddenResponse, serverErrorResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/plan
 * Change a user's subscription plan.
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
    const parsed = ChangePlanSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const newPlan = parsed.data.plan;
    const amountMonthly = getAdminPlanPriceCents(newPlan);
    const nowIso = new Date().toISOString();

    const { error: userErr } = await supabase
      .from("users")
      .update({ plan: newPlan })
      .eq("id", id);

    if (userErr) throw new Error(userErr.message);

    const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", id).eq("status", "active").limit(1).single();

    if (existing) {
      const { error: subErr } = await supabase
        .from("subscriptions")
        .update({ plan: newPlan, amount_monthly: amountMonthly, updated_at: nowIso })
        .eq("id", existing.id);
      if (subErr) throw new Error(subErr.message);
    } else {
      const { error: subErr } = await supabase
        .from("subscriptions")
        .insert({ user_id: id, plan: newPlan, amount_monthly: amountMonthly, status: "active", started_at: nowIso });
      if (subErr) throw new Error(subErr.message);
    }

    void writeAuditLog({ adminUserId: admin.id, action: "change_plan", targetType: "user", targetId: id, metadata: { plan: newPlan } });
    return successResponse({ plan: newPlan });
  } catch (err) {
    console.error("[Change Plan] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
