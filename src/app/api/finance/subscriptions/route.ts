import { withAdmin } from "@/lib/admin/with-admin";
/**
 * GET /api/finance/subscriptions
 *
 * Lists the most recent 100 subscriptions with user info.
 * Requires admin authentication.
 */
/**
 * POST /api/finance/subscriptions
 *
 * Creates a new subscription.
 * Requires admin authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { successResponse, badRequestResponse } from "@/lib/api-response";
import { CreateSubscriptionSchema } from "@/lib/admin/schemas";

export async function GET(request: NextRequest) {
  return withAdmin(request, {}, async ({ supabase }) => {

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, amount_monthly, status, started_at, cancelled_at, created_at, users(name, email)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return successResponse(data ?? []);
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(request, {}, async ({ supabase, audit }) => {

    const body = await request.json();
    const parsed = CreateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json(
        { success: false, error: `Validation failed: ${issues}` },
        { status: 422 }
      );
    }

    const data = await audit({
      action: "create_subscription",
      targetType: "subscription",
      metadata: { plan: parsed.data.plan },
    }, async () => {
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: parsed.data.user_id,
        plan: parsed.data.plan,
        amount_monthly: parsed.data.amount_monthly,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);



      return data;
    });
    return successResponse(data);
  });
}
