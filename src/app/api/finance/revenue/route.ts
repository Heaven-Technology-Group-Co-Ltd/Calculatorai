/**
 * GET /api/finance/revenue
 *
 * Returns MRR, ARR, churn rate, active subscription count,
 * and monthly revenue breakdown for the past 12 months.
 * Requires admin authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    await requireAdmin(request);

    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("amount_monthly")
      .eq("status", "active");

    const mrrCents = (activeSubs ?? []).reduce(
      (sum, s) => sum + (s.amount_monthly || 0),
      0
    );
    const mrr = mrrCents / 100;
    const arr = mrr * 12;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { count: cancelledCount } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled")
      .gte("cancelled_at", thirtyDaysAgo);

    const { count: totalSubs } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true });

    const churnRate = totalSubs && totalSubs > 0
      ? ((cancelledCount ?? 0) / totalSubs) * 100
      : 0;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: paidInvoices } = await supabase
      .from("invoices")
      .select("amount_cents, paid_at")
      .eq("status", "paid")
      .gte("paid_at", twelveMonthsAgo.toISOString());

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue: { month: string; revenue: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();

      const total = (paidInvoices ?? []).filter((inv) => {
        const invDate = new Date(inv.paid_at);
        return invDate.getFullYear() === year && invDate.getMonth() === month;
      }).reduce((sum, inv) => sum + (inv.amount_cents || 0), 0);

      monthlyRevenue.push({
        month: monthLabels[month],
        revenue: total / 100,
      });
    }

    return successResponse({
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      churnRate: Math.round(churnRate * 10) / 10,
      activeSubscriptions: activeSubs?.length ?? 0,
      monthlyRevenue,
    });
  } catch (err) {
    console.error("[Finance/Revenue] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
