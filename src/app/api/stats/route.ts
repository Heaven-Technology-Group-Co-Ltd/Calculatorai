import { withAdmin } from "@/lib/admin/with-admin";
import { loadPaymentRevenue, selectedRevenueDays } from "@/lib/finance/payment-revenue";
import { computePercentages } from "./percentages";
/**
 * Stats API — serves real data to the dashboard Overview page.
 *
 * GET /api/stats
 *
 * Admin-only endpoint. Returns aggregated statistics with no PII.
 */

import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";

/** Parse User-Agent string into device type */
function parseDeviceType(ua: string | null): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  const lower = ua.toLowerCase();
  if (/tablet|ipad/.test(lower)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(lower)) return "mobile";
  return "desktop";
}

export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const nowMs = Date.now();
    const yesterday = new Date(nowMs - 86_400_000).toISOString();
    const sevenDaysAgo = new Date(nowMs - 7 * 86_400_000).toISOString();
    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - 6);
    chartStart.setHours(0, 0, 0, 0);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const [users, recent, viewsTotal, viewRows, revenue, signupRows, latest, activeUsers] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", yesterday),
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("page_views").select("session_id, user_agent, created_at").gte("created_at", sevenDaysAgo < chartStart.toISOString() ? sevenDaysAgo : chartStart.toISOString()).order("created_at", { ascending: false }).limit(10000),
      loadPaymentRevenue(supabase, selectedRevenueDays(new URL(request.url).searchParams)),
      supabase.from("users").select("created_at").gte("created_at", twelveMonthsAgo.toISOString()).order("created_at", { ascending: true }),
      supabase.from("users").select("name, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("last_active_at", new Date(nowMs - selectedRevenueDays(new URL(request.url).searchParams) * 86_400_000).toISOString()),
    ]);
    if (users.error) throw new Error(`users: ${users.error.message}`);
    if (activeUsers.error) throw new Error("Failed to load active users");
    if (viewRows.error) throw new Error(`page_views: ${viewRows.error.message}`);
    const totalUsers = users.count;
    const recentUsers = recent.count;
    const totalPageViews7d = viewsTotal.count;
    const signups = signupRows.data;
    const latestUsers = latest.data;
    const monthlyRevenue = revenue.total;
    const views = viewRows.data ?? [];
    const activeRows = views.filter((view) => new Date(view.created_at).getTime() >= nowMs - 300_000);
    const activeSessions = new Set(activeRows.filter((view) => view.session_id).map((view) => view.session_id)).size
      + activeRows.filter((view) => !view.session_id).length;
    const seenDevices = new Set<string>();
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    for (const view of views) {
      if (view.created_at < sevenDaysAgo || (view.session_id && seenDevices.has(view.session_id))) continue;
      if (view.session_id) seenDevices.add(view.session_id);
      deviceCounts[parseDeviceType(view.user_agent)]++;
    }
    const percentages = computePercentages(deviceCounts);
    const deviceData = (["desktop", "mobile", "tablet"] as const).map((device) => ({
      device: device[0].toUpperCase() + device.slice(1), name: device[0].toUpperCase() + device.slice(1),
      count: deviceCounts[device], value: percentages[device],
    }));

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

    const recentActivity = (latestUsers || []).map((u) => {
      return {
        user: u.name || "User",
        action: "New user registered",
        time: u.created_at,
        icon: "fa-user-plus",
        color: "#60a5fa",
      };
    });

    const visitorChart = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(chartStart);
      dayStart.setDate(dayStart.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayViews = views.filter((view) => view.created_at >= dayStart.toISOString() && view.created_at < dayEnd.toISOString());
      const visitors = new Set(dayViews.filter((view) => view.session_id).map((view) => view.session_id)).size
        + dayViews.filter((view) => !view.session_id).length;
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayStart.getDay()], date: dayStart.toISOString().slice(0, 10), visitors, pageViews: dayViews.length, views: dayViews.length };
    });

    return successResponse({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers.count ?? 0,
      recentUsers: recentUsers || 0,
      activeSessions: activeSessions || 0,
      userGrowth,
      recentActivity,
      visitorChart,
      deviceData,
      monthlyRevenue,
      totalPageViews7d: totalPageViews7d || 0,
      serverTime: new Date().toISOString(),
    });
  });
}
