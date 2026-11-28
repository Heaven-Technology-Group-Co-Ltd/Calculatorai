import { withAdmin } from "@/lib/admin/with-admin";
/**
 * GET /api/finance/revenue
 *
 * Returns gross payment totals, average revenue per account, processed refund
 * count and a monthly breakdown for the selected reporting period.
 * Requires admin authentication.
 */
import { NextRequest } from "next/server";
import { loadPaymentRevenue, selectedRevenueDays } from "@/lib/finance/payment-revenue";
import { successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const days = selectedRevenueDays(new URL(request.url).searchParams);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const [revenue, users, refunds] = await Promise.all([
      loadPaymentRevenue(supabase, days),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "processed").gte("created_at", since),
    ]);
    if (users.error || refunds.error) throw new Error("Failed to load finance metrics");
    return successResponse({
      revenue: revenue.total,
      arpu: users.count ? revenue.total / users.count : null,
      refunds: refunds.count ?? 0,
      monthlyRevenue: revenue.months,
    });
  });
}
