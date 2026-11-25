/**
 * PUT /api/finance/subscriptions/[id]
 *
 * Updates an existing subscription (plan, status).
 * Requires admin authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { successResponse, serverErrorResponse } from "@/lib/api-response";
import { UpdateSubscriptionSchema } from "@/lib/admin/schemas";
import { writeAuditLog } from "@/lib/admin/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();

    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json(
        { success: false, error: `Validation failed: ${issues}` },
        { status: 422 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.plan) updateData.plan = parsed.data.plan;
    if (parsed.data.status) {
      updateData.status = parsed.data.status;
      if (parsed.data.status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
      }
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    void writeAuditLog({
      adminUserId: "system",
      action: "update_subscription",
      targetType: "subscription",
      targetId: id,
      metadata: updateData,
    });

    return successResponse(data);
  } catch (err) {
    console.error("[Finance/Subscriptions] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
