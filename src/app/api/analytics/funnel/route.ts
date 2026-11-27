import { withAdmin } from "@/lib/admin/with-admin";
/**
 * GET /api/analytics/funnel
 *
 * Returns conversion funnel data for the last 30 days:
 * Visit -> Engaged -> Calculated -> Returned stages.
 * Requires admin authentication.
 */
import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { count: visits } = await supabase.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo);

    const { data: engagedData } = await supabase.from("page_views").select("session_id").gte("created_at", thirtyDaysAgo);
    const engaged = new Set((engagedData ?? []).map((r) => r.session_id).filter(Boolean)).size;

    const { data: calcData } = await supabase.from("formula_usage").select("session_id").gte("created_at", thirtyDaysAgo).not("session_id", "is", null);
    const calculated = new Set((calcData ?? []).map((r) => r.session_id).filter(Boolean)).size;

    const allSids = (engagedData ?? []).map((r) => r.session_id).filter(Boolean);
    const freq: Record<string, number> = {};
    for (const s of allSids) freq[s] = (freq[s] || 0) + 1;
    const returned = Object.values(freq).filter((c) => c > 1).length;

    const v = visits ?? 0;
    return successResponse([
      { stage: "Visit", count: v, percentage: 100 },
      { stage: "Engaged", count: engaged, percentage: v > 0 ? Math.round((engaged / v) * 100) : 0 },
      { stage: "Calculated", count: calculated, percentage: v > 0 ? Math.round((calculated / v) * 100) : 0 },
      { stage: "Returned", count: returned, percentage: v > 0 ? Math.round((returned / v) * 100) : 0 },
    ]);
  });
}
