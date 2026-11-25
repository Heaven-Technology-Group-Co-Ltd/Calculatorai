import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { ChangePlanSchema } from "@/lib/admin/schemas";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

const PLAN_PRICES: Record<string, number> = { basic: 500, pro: 1200, enterprise: 3000 };

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

    const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", id).eq("status", "active").limit(1).single();

    if (existing) {
      await supabase.from("subscriptions").update({ plan: parsed.data.plan, amount_monthly: PLAN_PRICES[parsed.data.plan], updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({ user_id: id, plan: parsed.data.plan, amount_monthly: PLAN_PRICES[parsed.data.plan], status: "active" });
    }

    void writeAuditLog({ adminUserId: admin.id, action: "change_plan", targetType: "user", targetId: id, metadata: { plan: parsed.data.plan } });
    return successResponse({ plan: parsed.data.plan });
  } catch (err) {
    console.error("[Change Plan] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
