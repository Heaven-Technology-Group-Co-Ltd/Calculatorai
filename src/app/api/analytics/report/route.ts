import { isAllowedWebhookUrl } from "@/lib/admin/schemas";
/**
 * GET /api/analytics/report
 *
 * Returns the timestamp of the last weekly report sent.
 * Requires admin authentication.
 */
/**
 * POST /api/analytics/report
 *
 * Generates and sends a weekly analytics report to the Discord webhook.
 * Requires admin authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { withAdmin } from "@/lib/admin/with-admin";
import { successResponse, badRequestResponse } from "@/lib/api-response";
import { TriggerReportSchema } from "@/lib/admin/schemas";

/** Gather report data for the past 7 days. */
async function getReportData() {
  const supabase = getSupabaseAdmin();

  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000);
  const fiveMinutesAgo = new Date(Date.now() - 300_000).toISOString();

  const { count: newUsers } = await supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString());
  const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });
  const { data: activeViews } = await supabase.from("page_views").select("session_id").gte("created_at", fiveMinutesAgo).order("created_at", { ascending: false }).limit(10000);
  const onlineNow = new Set((activeViews ?? []).filter((view) => view.session_id).map((view) => view.session_id)).size
    + (activeViews ?? []).filter((view) => !view.session_id).length;

  const { data: formulaData } = await supabase.from("formula_usage").select("formula_id").gte("created_at", oneWeekAgo.toISOString()).order("created_at", { ascending: false }).limit(10000);
  const fc: Record<string, number> = {};
  for (const r of formulaData ?? []) fc[r.formula_id] = (fc[r.formula_id] || 0) + 1;
  const topFormula = Object.entries(fc).sort((a, b) => b[1] - a[1])[0];

  const { count: pvThisWeek } = await supabase.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString());
  const { count: pvLastWeek } = await supabase.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", oneWeekAgo.toISOString());
  const wow = pvLastWeek && pvLastWeek > 0 ? Math.round(((pvThisWeek ?? 0) - pvLastWeek) / pvLastWeek * 100) : 0;

  const { data: countryData } = await supabase.from("page_views").select("country").gte("created_at", oneWeekAgo.toISOString()).not("country", "is", null).order("created_at", { ascending: false }).limit(10000);
  const cc: Record<string, number> = {};
  for (const r of countryData ?? []) { if (r.country) cc[r.country] = (cc[r.country] || 0) + 1; }
  const topCountry = Object.entries(cc).sort((a, b) => b[1] - a[1])[0];

  return {
    newUsers: newUsers ?? 0, totalUsers: totalUsers ?? 0, onlineNow: onlineNow ?? 0,
    topFormula: topFormula ? { name: topFormula[0], uses: topFormula[1] } : null,
    pvThisWeek: pvThisWeek ?? 0, wowChange: wow,
    topCountry: topCountry ? { code: topCountry[0], pct: countryData ? Math.round((topCountry[1] / countryData.length) * 100) : 0 } : null,
  };
}

export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const { data } = await supabase.from("admin_audit_log").select("created_at").eq("action", "weekly_report_sent").order("created_at", { ascending: false }).limit(1);
    return successResponse({ lastSent: data?.[0]?.created_at ?? null });
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(request, async ({ supabase, audit }) => {

    const body = await request.json();
    const parsed = TriggerReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` },
        { status: 422 }
      );
    }

    let webhookUrl: string | null = null;
    if (parsed.data.webhook_id) {
      const { data: wh } = await supabase.from("discord_webhooks").select("url").eq("id", parsed.data.webhook_id).single();
      webhookUrl = wh?.url ?? null;
    }
    if (!webhookUrl) {
      const { data: wh } = await supabase.from("discord_webhooks").select("url").eq("status", "active").eq("event_type", "analytics").limit(1).single();
      webhookUrl = wh?.url ?? null;
    }
    if (!webhookUrl || !isAllowedWebhookUrl(webhookUrl)) return badRequestResponse("No valid analytics webhook configured");

    const d = await getReportData();
    const monday = new Date(); monday.setDate(monday.getDate() - monday.getDay() + 1);
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    const range = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const payload = {
      username: "Analytics Reporter",
      embeds: [{
        title: `📊 Weekly Analytics Report — ${range}`,
        color: 0x3498db,
        fields: [
          { name: "👥 Users", value: `+${d.newUsers} new · ${d.totalUsers} total · ${d.onlineNow} online`, inline: true },
          { name: "📐 Top Formula", value: d.topFormula ? `${d.topFormula.name} (${d.topFormula.uses} uses)` : "N/A", inline: true },
          { name: "📈 Page Views", value: `${d.pvThisWeek.toLocaleString()} (${d.wowChange >= 0 ? "+" : ""}${d.wowChange}% WoW)`, inline: true },
          { name: "🌍 Top Country", value: d.topCountry ? `:flag_${d.topCountry.code.toLowerCase()}: ${d.topCountry.code} (${d.topCountry.pct}%)` : "N/A", inline: true },
        ],
        footer: { text: "No PII included — aggregated statistics only" },
        timestamp: new Date().toISOString(),
      }],
    };

    await audit({ action: "weekly_report_sent", metadata: { range } }, async () => {
      const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`Discord responded ${response.status}`);
    });
    return successResponse({ sent: true, range });
  });
}
