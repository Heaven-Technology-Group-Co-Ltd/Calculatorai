/**
 * GET /api/analytics/traffic
 *
 * Returns traffic analytics for the past 30 days:
 * top pages, geography breakdown, referral sources, total views.
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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: pageViews } = await supabase.from("page_views").select("path, referrer, country").gte("created_at", thirtyDaysAgo);

    const pathCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};
    let totalViews = 0;

    for (const row of pageViews ?? []) {
      totalViews++;
      pathCounts[row.path] = (pathCounts[row.path] || 0) + 1;
      if (row.country) countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
      if (row.referrer) { const ref = (() => { try { return new URL(row.referrer).hostname; } catch { return row.referrer; } })(); referrerCounts[ref] = (referrerCounts[ref] || 0) + 1; }
    }

    return successResponse({
      topPages: Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views })),
      geography: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, views]) => ({ country, views, percentage: totalViews > 0 ? Math.round((views / totalViews) * 100) : 0 })),
      referrals: Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, views]) => ({ source, views })),
      totalViews,
    });
  } catch (err) {
    console.error("[Analytics/Traffic] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
