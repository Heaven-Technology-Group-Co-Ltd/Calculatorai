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
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { getRuntimeHealth } from "@/lib/runtime-health";

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

// In-process runtime probe. A serverless function must not call its own HTTP
// endpoint: the nested invocation added a cold-start hop and read a stale env
// name (NEXT_PUBLIC_URL), so the check reported "unreachable" on a healthy app.
function checkNextjs(): ServiceCheck {
  const start = Date.now();
  const { ok } = getRuntimeHealth();
  return ok
    ? { status: "ok", latencyMs: Date.now() - start }
    : { status: "error", latencyMs: Date.now() - start, message: "Runtime uptime unavailable" };
}

const BOT_HEARTBEAT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

// The bot is a separate long-running process (discord-bot/, Gateway), so the web
// app holds no bot token and cannot probe Discord on its behalf. Liveness comes
// only from the heartbeat the bot writes. Control strings below are this route's
// own text, safe to expose.
async function checkDiscord(db: SupabaseClient<any>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const hb = await withTimeout(
      db.from("bot_heartbeats").select("last_seen").eq("service", "discord").maybeSingle(),
      3_000,
      "Heartbeat timeout",
    );
    if (hb.error) throw hb.error;
    if (!hb.data) {
      return { status: "error", latencyMs: Date.now() - start, message: "No bot heartbeat recorded" };
    }
    const ageMs = Date.now() - new Date(hb.data.last_seen as string).getTime();
    if (ageMs > BOT_HEARTBEAT_THRESHOLD_MS) {
      return {
        status: "error",
        latencyMs: Date.now() - start,
        message: `Bot last seen ${Math.round(ageMs / 3_600_000)}h ago`,
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

// Whole-payload cache. proxy.ts forces `Cache-Control: no-store`, so in-process
// reuse is the only way to keep burst traffic off Supabase/Stripe/SMTP.
let probesCache: {
  checks: Record<Service, ServiceCheck>;
  stats: Record<keyof typeof RANGE_MS, RangeStats>;
  at: number;
} | null = null;
const STATUS_TTL = 30_000;

// Per-IP burst guard. In-process on purpose: src/lib/rate-limiter.ts is
// Supabase-backed and fail-open, so it cannot short-circuit before the probes
// it exists to protect, and it would add the round trip it is meant to save.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CLIENTS = 5_000;
const recentHits = new Map<string, number[]>();

function takeStatusSlot(ip: string, now: number): { allowed: boolean; retryAfter: number } {
  const hits = (recentHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    recentHits.set(ip, hits);
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - hits[0]);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  hits.push(now);
  if (!recentHits.has(ip) && recentHits.size >= RATE_LIMIT_MAX_CLIENTS) {
    // Bound the map: drop the oldest tracked client before inserting a new one.
    const oldest = recentHits.keys().next();
    if (!oldest.done) recentHits.delete(oldest.value);
  }
  recentHits.set(ip, hits);
  return { allowed: true, retryAfter: 0 };
}

async function collectChecks(db: SupabaseClient<any>): Promise<Record<Service, ServiceCheck>> {
  const [supabaseCheck, stripeCheck, smtpCheck, discordCheck] = await Promise.all([
    checkSupabase(db),
    checkStripe(),
    checkSmtp(),
    checkDiscord(db),
  ]);
  return {
    supabase: supabaseCheck,
    stripe: stripeCheck,
    smtp: smtpCheck,
    discord: discordCheck,
    nextjs: checkNextjs(),
  };
}

export async function GET(request: Request) {
  const start = Date.now();
  const slot = takeStatusSlot(getClientIpFromHeaders(request.headers), start);
  if (!slot.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(slot.retryAfter) } },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    // ponytail: untyped until `health_checks` lands in database.types.ts regen; then drop cast.
    const db = supabase as unknown as SupabaseClient<any>;
    const state = getState();

    let snapshot = probesCache && start - probesCache.at < STATUS_TTL ? probesCache : null;

    if (!snapshot) {
      const checks = await collectChecks(db);

      const { error: persistErr } = await db.from("health_checks").insert(
        (Object.entries(checks) as [Service, ServiceCheck][]).map(([service, c]) => ({
          service,
          status: c.status,
          latency_ms: c.latencyMs,
          details: c.message ? { message: c.message } : {},
        })),
      );
      if (persistErr) console.error("[Status] Persist failed:", persistErr);

      const statsAt = Date.now();
      if (!statsCache || statsAt - statsCache.at > STATS_TTL) {
        statsCache = { data: await buildStats(db), at: statsAt };
      }
      snapshot = { checks, stats: statsCache.data, at: statsAt };
      probesCache = snapshot;
    }

    const uptimeSeconds = Math.floor(
      (Date.now() - new Date(state.uptimeStart).getTime()) / 1000,
    );

    const allOk =
      SERVICES.every((s) => snapshot.checks[s].status === "ok") && !state.maintenanceMode;

    const data = {
      status: allOk ? ("operational" as const) : ("degraded" as const),
      maintenanceMode: state.maintenanceMode,
      maintenanceMessage: state.maintenanceMessage,
      uptimeSeconds,
      lastCommand: state.lastCommand,
      lastCommandBy: state.lastCommandBy,
      lastCommandAt: state.lastCommandAt,
      checks: snapshot.checks,
      stats: snapshot.stats,
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
