/**
 * GET /api/finance/invoices
 *
 * Lists the most recent 100 invoices with user info.
 * Requires admin authentication.
 */
/**
 * POST /api/finance/invoices
 *
 * Creates a new invoice record.
 * Requires admin authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { successResponse, serverErrorResponse } from "@/lib/api-response";
import { CreateInvoiceSchema } from "@/lib/admin/schemas";
import { withAuditLog } from "@/lib/admin/audit";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    await requireAdmin(request);

    const { data, error } = await supabase
      .from("invoices")
      .select("id, user_id, amount_cents, status, stripe_invoice_id, created_at, paid_at, users(name, email)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return successResponse(data ?? []);
  } catch (err) {
    console.error("[Finance/Invoices] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const admin = await requireAdmin(request);

    const body = await request.json();
    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json(
        { success: false, error: `Validation failed: ${issues}` },
        { status: 422 }
      );
    }

    const data = await withAuditLog({
      adminUserId: admin.id,
      action: "create_invoice",
      targetType: "invoice",
      metadata: { amount_cents: parsed.data.amount_cents },
    }, async () => {
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id: parsed.data.user_id ?? null,
        amount_cents: parsed.data.amount_cents,
        status: parsed.data.status ?? "pending",
        stripe_invoice_id: parsed.data.stripe_invoice_id ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);



      return data;
    });
    return successResponse(data);
  } catch (err) {
    console.error("[Finance/Invoices] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
