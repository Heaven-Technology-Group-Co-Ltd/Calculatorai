/**
 * GET /api/analytics/sessions
 *
 * Returns session metrics for the past 7 days:
 * active sessions, bounce rate, conversion rate, total calculations.
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

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count: activeSessions } = await supabase.from("sessions").select("*", { count: "exact", head: true }).gt("expires", now);
    const { count: totalPv7d } = await supabase.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo);

    const { data: allSessions } = await supabase.from("page_views").select("session_id").gte("created_at", sevenDaysAgo);
    const freq: Record<string, number> = {};
    for (const r of allSessions ?? []) { if (r.session_id) freq[r.session_id] = (freq[r.session_id] || 0) + 1; }
    const bounced = Object.values(freq).filter((c) => c === 1).length;
    const totalSess = Object.keys(freq).length;
    const bounceRate = totalSess > 0 ? Math.round((bounced / totalSess) * 100) : 0;

    const { data: calcSessions } = await supabase.from("formula_usage").select("session_id").gte("created_at", sevenDaysAgo).not("session_id", "is", null);
    const calcSessionSet = new Set((calcSessions ?? []).map((r) => r.session_id));
    const conversionRate = totalSess > 0 ? Math.round((calcSessionSet.size / totalSess) * 100) : 0;

    const totalCalculations = (calcSessions ?? []).length;

    return successResponse({
      totalCalculations,
      activeSessions: activeSessions ?? 0,
      bounceRate,
      conversionRate,
      avgSessionDuration: 0,
    });
  } catch (err) {
    console.error("[Analytics/Sessions] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
