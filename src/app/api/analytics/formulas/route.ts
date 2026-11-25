/**
 * GET /api/analytics/formulas
 *
 * Returns formula usage heatmap (last 30 days) and top 10 formulas.
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
    const { data } = await supabase.from("formula_usage").select("formula_id, created_at").gte("created_at", thirtyDaysAgo);

    const heatmap: Record<string, Record<string, number>> = {};
    for (const row of data ?? []) {
      const day = new Date(row.created_at).toLocaleDateString("en-US", { weekday: "short" });
      if (!heatmap[row.formula_id]) heatmap[row.formula_id] = {};
      heatmap[row.formula_id][day] = (heatmap[row.formula_id][day] || 0) + 1;
    }

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rows = Object.entries(heatmap).map(([formula_id, dayCounts]) => ({
      formula_id, ...Object.fromEntries(days.map((d) => [d, dayCounts[d] || 0])),
    }));

    const topFormulas = Object.entries(heatmap)
      .map(([id, counts]) => ({ id, total: Object.values(counts).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    return successResponse({ heatmap: rows, topFormulas, days });
  } catch (err) {
    console.error("[Analytics/Formulas] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
