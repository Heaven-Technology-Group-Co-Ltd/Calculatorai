import { withAdmin } from "@/lib/admin/with-admin";
/**
 * GET /api/finance/refunds
 *
 * Lists the most recent 100 refunds.
 * Requires admin authentication.
 */
/**
 * POST /api/finance/refunds
 *
 * Creates a new refund request.
 * Requires admin authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { CreateRefundSchema } from "@/lib/admin/schemas";

export async function GET(request: NextRequest) {
  return withAdmin(request, {}, async ({ supabase }) => {

    const { data, error } = await supabase
      .from("refunds")
      .select("id, invoice_id, amount_cents, reason, status, created_at, processed_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return successResponse(data ?? []);
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(request, {}, async ({ supabase, audit }) => {

    const body = await request.json();
    const parsed = CreateRefundSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json(
        { success: false, error: `Validation failed: ${issues}` },
        { status: 422 }
      );
    }

    const data = await audit({
      action: "create_refund",
      targetType: "refund",
      metadata: { invoice_id: parsed.data.invoice_id, amount_cents: parsed.data.amount_cents },
    }, async () => {
    const { data, error } = await supabase
      .from("refunds")
      .insert({
        invoice_id: parsed.data.invoice_id,
        amount_cents: parsed.data.amount_cents,
        reason: parsed.data.reason ?? null,
        status: "requested",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);



      return data;
    });
    return successResponse(data);
  });
}
