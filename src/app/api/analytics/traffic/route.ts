import { withAdmin } from "@/lib/admin/with-admin";
/**
 * GET /api/analytics/traffic
 *
 * Returns traffic analytics for the past 30 days:
 * top pages, geography breakdown, referral sources, total views.
 * Requires admin authentication.
 */
import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [viewsResponse, totalResponse] = await Promise.all([
      supabase.from("page_views").select("path, referrer, country").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }).limit(10000),
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    ]);
    if (viewsResponse.error || totalResponse.error) throw new Error("Failed to load traffic analytics");
    const pageViews = viewsResponse.data;

    const pathCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};
    const totalViews = totalResponse.count ?? 0;
    const sampledViews = pageViews?.length ?? 0;

    for (const row of pageViews ?? []) {
      pathCounts[row.path] = (pathCounts[row.path] || 0) + 1;
      if (row.country) countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
      if (row.referrer) { const ref = (() => { try { return new URL(row.referrer).hostname; } catch { return row.referrer; } })(); referrerCounts[ref] = (referrerCounts[ref] || 0) + 1; }
    }

    return successResponse({
      topPages: Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views })),
      geography: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, views]) => ({ country, views, percentage: sampledViews > 0 ? Math.round((views / sampledViews) * 100) : 0 })),
      referrals: Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, views]) => ({ source, views })),
      totalViews,
    });
  });
}
