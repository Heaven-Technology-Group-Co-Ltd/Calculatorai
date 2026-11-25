/**
 * GET /api/status
 *
 * Public. Checks every service, persists each result to `health_checks`,
 * and returns current status plus uptime stats for 24h / 7d / 30d.
 */
import { NextResponse } from "next/server";
import net from "net";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { getState } from "@/lib/admin/state";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "error" | "degraded";

interface ServiceCheck {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
}

const SERVICES = ["supabase", "stripe", "smtp", "discord", "nextjs"] as const;
type Service = (typeof SERVICES)[number];

const RANGE_MS = {
  "24h": 24 * 3_600_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
} as const;

interface ServiceRangeStats {
  uptimePct: number | null;
  avgLatencyMs: number;
  checks: number;
  incidents: number;
}

interface RangeStats extends ServiceRangeStats {
  services: Record<string, ServiceRangeStats>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Static, service-specific messages only — upstream error text (PostgREST,
// Stripe SDK, socket errors) must not reach the public status page; details stay in server logs.
function fail(start: number, err: unknown, message: string): ServiceCheck {
  console.error("[Status] Check failed:", err);
  return {
    status: "error",
    latencyMs: Date.now() - start,
    message,
  };
}

function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// SMTP verify cache (TCP connect test, not full handshake)
let smtpVerifiedAt = 0;
const SMTP_VERIFY_TTL = 60_000; // 60s cache
let stripeCache: { result: ServiceCheck; at: number } | null = null;
const STRIPE_TTL = 60_000;

async function checkSupabase(db: SupabaseClient<any>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { error } = await withTimeout(
      db.from("health_checks").select("id").limit(1),
      3_000,
      "Supabase timeout",
    );
    if (error) throw error;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err, "Database connection failed");
  }
}

async function checkStripe(): Promise<ServiceCheck> {
  if (stripeCache && Date.now() - stripeCache.at < STRIPE_TTL) return stripeCache.result;
  const start = Date.now();
  let result: ServiceCheck;
  try {
    const { getStripe } = await import("@/lib/stripe");
    await withTimeout(getStripe().balance.retrieve(), 3_000, "Stripe timeout");
    result = { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    result = fail(start, err, "Stripe API unreachable");
  }
  stripeCache = { result, at: Date.now() };
  return result;
}

async function checkSmtp(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    // Early return keeps "SMTP not configured" as a control string the route
    // itself wrote; the catch below replaces socket/timeout errors with static text.
    if (!process.env.SMTP_HOST) {
      return { status: "error", latencyMs: Date.now() - start, message: "SMTP not configured" };
    }
    const now = Date.now();
    if (now - smtpVerifiedAt < SMTP_VERIFY_TTL) {
      return { status: "ok", latencyMs: now - start };
    }
    // TCP connect test — เบากว่า full SMTP handshake มาก
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const sock = net.connect(Number(process.env.SMTP_PORT) || 587, process.env.SMTP_HOST!);
        sock.once("connect", () => { sock.end(); resolve(); });
        sock.once("error", reject);
        sock.setTimeout(3_000, () => { sock.destroy(); reject(new Error("SMTP TCP timeout")); });
      }),
      3_000,
      "SMTP TCP timeout",
    );
    smtpVerifiedAt = now;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err, "SMTP connection failed");
  }
}

async function checkNextjs(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const base = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) {
      // Own health-endpoint status: a control string the route wrote, safe to expose.
      return {
        status: "error",
        latencyMs: Date.now() - start,
        message: `Health endpoint ${res.status}`,
      };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err, "Health endpoint unreachable");
  }
}

const BOT_HEARTBEAT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

async function checkDiscord(db: SupabaseClient<any>): Promise<ServiceCheck> {
  const start = Date.now();
  // Control string written by this route — safe to expose.
  if (!process.env.DISCORD_BOT_TOKEN) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      message: "Bot token not configured",
    };
  }

  try {
    let res: Response;
    try {
      res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (err) {
      return fail(start, err, "Discord API unreachable");
    }
    if (!res.ok) {
      // HTTP status of the upstream check: control string, no internal detail.
      return {
        status: "error",
        latencyMs: Date.now() - start,
        message: `Discord API ${res.status}`,
      };
    }

    const hb = await db.from("bot_heartbeats").select("last_seen").eq("service", "discord").single();
    if (hb.error || !hb.data) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        message: "Bot heartbeat not found — bot may not be running",
      };
    }
    const lastSeen = new Date(hb.data.last_seen).getTime();
    if (Date.now() - lastSeen > BOT_HEARTBEAT_THRESHOLD_MS) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        message: `Bot last seen ${Math.round((Date.now() - lastSeen) / 3_600_000)}h ago`,
      };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err, "Discord heartbeat check failed");
  }
}

function summarize(
  rows: { service: string; status: string; latency_ms: number }[],
): RangeStats {
  const services: Record<string, ServiceRangeStats> = {};
  for (const s of SERVICES) {
    const rs = rows.filter((r) => r.service === s);
    const ok = rs.filter((r) => r.status === "ok").length;
    services[s] = {
      // health_checks rows are written only when the status page is polled;
      // null means no samples in range, not 100% uptime.
      uptimePct: rs.length ? round1((ok / rs.length) * 100) : null,
      avgLatencyMs: rs.length
        ? Math.round(rs.reduce((sum, r) => sum + (r.latency_ms ?? 0), 0) / rs.length)
        : 0,
      checks: rs.length,
      incidents: rs.length - ok,
    };
  }
  const allOk = rows.filter((r) => r.status === "ok").length;
  return {
    uptimePct: rows.length ? round1((allOk / rows.length) * 100) : null,
    avgLatencyMs: rows.length
      ? Math.round(rows.reduce((sum, r) => sum + (r.latency_ms ?? 0), 0) / rows.length)
      : 0,
    checks: rows.length,
    incidents: rows.length - allOk,
    services,
  };
}

async function buildStats(
  db: SupabaseClient<any>,
): Promise<Record<keyof typeof RANGE_MS, RangeStats>> {
  let rows: { service: string; status: string; latency_ms: number; created_at: string }[] = [];
  try {
    const { data } = await db
      .from("health_checks")
      .select("service,status,latency_ms,created_at")
      .gte("created_at", new Date(Date.now() - RANGE_MS["30d"]).toISOString())
      .order("created_at", { ascending: false })
      // ponytail: capped scan fine at status-page traffic; move to SQL rpc when volume grows.
      .limit(10_000);
    rows = data ?? [];
  } catch (err) {
    console.error("[Status] Stats query failed:", err);
  }

  const out = {} as Record<keyof typeof RANGE_MS, RangeStats>;
  for (const [range, ms] of Object.entries(RANGE_MS) as [keyof typeof RANGE_MS, number][]) {
    const cutoff = Date.now() - ms;
    out[range] = summarize(rows.filter((r) => new Date(r.created_at).getTime() >= cutoff));
  }
  return out;
}

// Stats cache — 60s TTL to avoid 10k-row scan on every request
let statsCache: { data: Record<keyof typeof RANGE_MS, RangeStats>; at: number } | null = null;
const STATS_TTL = 60_000;

export async function GET() {
  const start = Date.now();

  try {
    const supabase = getSupabaseAdmin();
    // ponytail: untyped until `health_checks` lands in database.types.ts regen; then drop cast.
    const db = supabase as unknown as SupabaseClient<any>;
    const state = getState();

    const [supabaseCheck, stripeCheck, smtpCheck, discordCheck] = await Promise.all([
      checkSupabase(db),
      checkStripe(),
      checkSmtp(),
      checkDiscord(db),
    ]);

    const checks: Record<Service, ServiceCheck> = {
      supabase: supabaseCheck,
      stripe: stripeCheck,
      smtp: smtpCheck,
      discord: discordCheck,
      nextjs: await checkNextjs(),
    };

    const { error: persistErr } = await db.from("health_checks").insert(
      (Object.entries(checks) as [Service, ServiceCheck][]).map(([service, c]) => ({
        service,
        status: c.status,
        latency_ms: c.latencyMs,
        details: c.message ? { message: c.message } : {},
      })),
    );
    if (persistErr) console.error("[Status] Persist failed:", persistErr);

    const now = Date.now();
    if (!statsCache || now - statsCache.at > STATS_TTL) {
      const fresh = await buildStats(db);
      statsCache = { data: fresh, at: now };
    }
    const stats = statsCache.data;

    const uptimeSeconds = Math.floor(
      (Date.now() - new Date(state.uptimeStart).getTime()) / 1000,
    );

    const allOk =
      SERVICES.every((s) => checks[s].status === "ok") && !state.maintenanceMode;

    const data = {
      status: allOk ? ("operational" as const) : ("degraded" as const),
      maintenanceMode: state.maintenanceMode,
      maintenanceMessage: state.maintenanceMessage,
      uptimeSeconds,
      lastCommand: state.lastCommand,
      lastCommandBy: state.lastCommandBy,
      lastCommandAt: state.lastCommandAt,
      checks,
      stats,
      totalLatencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };

    // Always 200: data.status distinguishes operational/degraded. A 503 here
    // reads as whole-endpoint outage to external monitors and skews the stats.
    return successResponse(data);
  } catch (err) {
    console.error("[Status] Error:", err);
    return serverErrorResponse();
  }
}
