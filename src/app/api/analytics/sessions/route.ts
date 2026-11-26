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

    const nowMs = Date.now();
    const sevenDaysAgo = new Date(nowMs - 7 * 86_400_000).toISOString();
    const [viewsResponse, calculationsResponse] = await Promise.all([
      supabase.from("page_views").select("session_id, created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }).limit(10000),
      supabase.from("formula_usage").select("session_id").gte("created_at", sevenDaysAgo).not("session_id", "is", null).order("created_at", { ascending: false }).limit(10000),
    ]);
    if (viewsResponse.error || calculationsResponse.error) throw new Error("Failed to load session analytics");
    const sessions = new Map<string, { count: number; first: number; last: number }>();
    let anonymous = 0;
    let activeAnonymous = 0;
    const activeIds = new Set<string>();
    for (const view of viewsResponse.data ?? []) {
      const timestamp = new Date(view.created_at).getTime();
      if (timestamp >= nowMs - 300_000) {
        if (view.session_id) activeIds.add(view.session_id); else activeAnonymous++;
      }
      if (!view.session_id) { anonymous++; continue; }
      const previous = sessions.get(view.session_id);
      sessions.set(view.session_id, { count: (previous?.count ?? 0) + 1, first: Math.min(previous?.first ?? timestamp, timestamp), last: Math.max(previous?.last ?? timestamp, timestamp) });
    }
    const totalSess = sessions.size + anonymous;
    const bounced = [...sessions.values()].filter((session) => session.count === 1).length + anonymous;
    const bounceRate = totalSess ? Math.round(bounced * 100 / totalSess) : 0;
    const calcSessions = calculationsResponse.data ?? [];
    const converted = new Set(calcSessions.map((row) => row.session_id).filter((id) => id && sessions.has(id))).size;
    const conversionRate = totalSess ? Math.round(converted * 100 / totalSess) : 0;
    const totalCalculations = calcSessions.length;
    const activeSessions = activeIds.size + activeAnonymous;
    const duration = [...sessions.values()].reduce((sum, session) => sum + session.last - session.first, 0);
    const avgSessionDuration = totalSess ? Math.round(duration / totalSess / 1000) : 0;

    return successResponse({
      totalCalculations,
      activeSessions,
      bounceRate,
      conversionRate,
      avgSessionDuration,
    });
  } catch (err) {
    console.error("[Analytics/Sessions] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
