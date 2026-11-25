/**
 * Stats API — serves real data to the dashboard Overview page.
 *
 * GET /api/stats
 *
 * Admin-only endpoint. Returns aggregated statistics with no PII.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/** Parse User-Agent string into device type */
function parseDeviceType(ua: string | null): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  const lower = ua.toLowerCase();
  if (/tablet|ipad/.test(lower)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(lower)) return "mobile";
  return "desktop";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    // ── Total users ──
    const { count: totalUsers, error: usersErr } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersErr) throw new Error(`users: ${usersErr.message}`);

    // ── Users registered in last 24h ──
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const { count: recentUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday);

    // ── Active sessions (users with a valid session = "online now") ──
    const now = new Date().toISOString();
    const { count: activeSessions } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gt("expires", now);

    // ── Device breakdown from sessions (real data) ──
    const { data: deviceRows } = await supabase
      .from("sessions")
      .select("user_agent")
      .gt("expires", now);

    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    let deviceTotal = 0;
    if (deviceRows) {
      for (const row of deviceRows) {
        const type = parseDeviceType(row.user_agent);
        deviceCounts[type]++;
        deviceTotal++;
      }
    }

    // Fallback: if no active sessions with user_agent, estimate from all recent sessions
    if (deviceTotal === 0) {
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: recentSessions } = await supabase
        .from("sessions")
        .select("user_agent")
        .gte("expires", weekAgo);

      if (recentSessions) {
        for (const row of recentSessions) {
          const type = parseDeviceType(row.user_agent);
          deviceCounts[type]++;
          deviceTotal++;
        }
      }
    }

    const deviceData = [
      { device: "Desktop", name: "Desktop", count: deviceCounts.desktop, value: deviceTotal > 0 ? Math.round((deviceCounts.desktop / deviceTotal) * 100) : 0 },
      { device: "Mobile", name: "Mobile", count: deviceCounts.mobile, value: deviceTotal > 0 ? Math.round((deviceCounts.mobile / deviceTotal) * 100) : 0 },
      { device: "Tablet", name: "Tablet", count: deviceCounts.tablet, value: deviceTotal > 0 ? 100 - Math.round((deviceCounts.desktop / deviceTotal) * 100) - Math.round((deviceCounts.mobile / deviceTotal) * 100) : 0 },
    ];

    // ── Page views total (last 7 days) ──
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count: totalPageViews7d, error: pvErr } = await supabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    if (pvErr && pvErr.code !== "42P01") {
      // 42P01 = table doesn't exist yet (migration not run) — fallback silently
      console.warn("page_views query:", pvErr.message);
    }

    // ── Revenue from subscriptions (real MRR) ──
    const { data: activeSubs, error: subErr } = await supabase
      .from("subscriptions")
      .select("amount_monthly")
      .eq("status", "active");

    if (subErr && subErr.code !== "42P01") {
      console.warn("subscriptions query:", subErr.message);
    }

    let monthlyRevenue = 0;
    if (activeSubs && activeSubs.length > 0) {
      // Sum all active subscription amounts (stored in cents)
      monthlyRevenue = activeSubs.reduce((sum, s) => sum + (s.amount_monthly || 0), 0) / 100;
    }
    // If no subscriptions table or no subs, revenue = 0 (no more fake estimate)

    // ── User growth: signups per month for the last 12 months ──
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const { data: signups } = await supabase
      .from("users")
      .select("created_at")
      .gte("created_at", twelveMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySignups: Record<string, number> = {};
    if (signups) {
      for (const row of signups) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        monthlySignups[key] = (monthlySignups[key] || 0) + 1;
      }
    }

    const userGrowth: { month: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      const targetMonth = d.getMonth() - i;
      d.setMonth(targetMonth);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      userGrowth.push({ month: monthLabels[d.getMonth()], value: monthlySignups[key] || 0 });
    }

    // ── Recent users (last 8, for activity feed) ──
    const { data: latestUsers } = await supabase
      .from("users")
      .select("name, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    const recentActivity = (latestUsers || []).map((u) => {
      const minsAgo = Math.max(0, Math.floor((Date.now() - new Date(u.created_at).getTime()) / 60_000));
      const timeLabel = minsAgo < 1 ? "Just now" : minsAgo < 60 ? `${minsAgo} min ago` : `${Math.floor(minsAgo / 60)}h ago`;
      return {
        user: u.name || "User",
        action: "New user registered",
        time: timeLabel,
        icon: "fa-user-plus",
        color: "#60a5fa",
      };
    });

    // ── Sessions per day + page views per day (last 7 days) ──
    const visitorChart: { day: string; date?: string; visitors: number; pageViews: number; views?: number }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayStartISO = dayStart.toISOString();
      const dayEndISO = dayEnd.toISOString();

      const { count: daySessions } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("expires", dayStartISO)
        .lte("expires", dayEndISO);

      // Real page views per day
      const { count: dayPageViews, error: dpvErr } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dayStartISO)
        .lte("created_at", dayEndISO);

      visitorChart.push({
        day: dayNames[dayStart.getDay()],
        date: dayStartISO.slice(0, 10),
        visitors: daySessions || 0,
        pageViews: dpvErr ? 0 : (dayPageViews || 0),
        views: dpvErr ? 0 : (dayPageViews || 0),
      });
    }

    return successResponse({
      totalUsers: totalUsers || 0,
      recentUsers: recentUsers || 0,
      activeSessions: activeSessions || 0,
      userGrowth,
      recentActivity,
      visitorChart,
      deviceData,
      monthlyRevenue: Math.round(monthlyRevenue),
      totalPageViews7d: totalPageViews7d || 0,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Stats] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
