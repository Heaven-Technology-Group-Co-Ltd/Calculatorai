/**
 * GET /api/status/history
 *
 * Public. Health-check history aggregated into chart-ready buckets.
 * Query params:
 *   service — one of supabase|stripe|smtp|nextjs (omit = all)
 *   range   — 24h (hourly buckets) | 7d | 30d (daily buckets; default 24h)
 */
import { NextRequest, NextResponse } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import {
  successResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { SERVICES, type ServiceKey as Service } from "@/app/status/constants";

export const dynamic = "force-dynamic";

type Range = "24h" | "7d" | "30d";

const RANGES: Record<Range, { windowMs: number; bucketMs: number; bucket: "hour" | "day" }> = {
  "24h": { windowMs: 24 * 3_600_000, bucketMs: 3_600_000, bucket: "hour" },
  "7d": { windowMs: 7 * 86_400_000, bucketMs: 86_400_000, bucket: "day" },
  "30d": { windowMs: 30 * 86_400_000, bucketMs: 86_400_000, bucket: "day" },
};

interface BucketStats {
  checks: number;
  // null = no samples, not 100% uptime (health_checks only written on poll)
  uptimePct: number | null;
  avgLatencyMs: number;
  incidents: number;
}

interface HealthHistoryRow {
  bucket: string;
  service: string;
  checks: number;
  ok: number;
  avg_latency: number;
}

const recentRequests = new Map<string, number[]>();
const historyCache = new Map<string, { at: number; response: unknown }>();

function takeSlot(ip: string): number {
  const now = Date.now();
  const times = (recentRequests.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (times.length >= 30) return Math.max(1, Math.ceil((60_000 - now + times[0]) / 1000));
  times.push(now);
  if (!recentRequests.has(ip) && recentRequests.size >= 5000) {
    const oldest = recentRequests.keys().next();
    if (!oldest.done) recentRequests.delete(oldest.value);
  }
  recentRequests.set(ip, times);
  return 0;
}

export async function GET(request: NextRequest) {
  const retryAfter = takeSlot(getClientIpFromHeaders(request.headers));
  if (retryAfter) return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  try {
    const params = request.nextUrl.searchParams;

    const rangeParam = params.get("range") ?? "24h";
    if (!Object.hasOwn(RANGES, rangeParam)) {
      return badRequestResponse("Invalid range. Use 24h, 7d, or 30d.");
    }
    const range = rangeParam as Range;

    const serviceParam = params.get("service");
    if (serviceParam && !(SERVICES as readonly string[]).includes(serviceParam)) {
      return badRequestResponse(`Invalid service. Use one of: ${SERVICES.join(", ")}.`);
    }
    const services = (serviceParam ? [serviceParam] : [...SERVICES]) as Service[];
    const cacheKey = `${range}:${serviceParam ?? "all"}`;
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 30_000) return successResponse(cached.response);

    const { windowMs, bucketMs, bucket } = RANGES[range];
    const rawWindowStart = Date.now() - windowMs;
    // Truncate to bucket boundary so JS bucket keys match SQL date_trunc output
    const windowStart = bucket === "hour"
      ? Math.floor(rawWindowStart / 3_600_000) * 3_600_000
      : Math.floor(rawWindowStart / 86_400_000) * 86_400_000;
    const bucketCount = Math.ceil(windowMs / bucketMs);

    const supabase = getSupabaseAdmin();
    const db = supabase as unknown as SupabaseClient<any>;

    const since = new Date(windowStart).toISOString();
    const { data: rows, error } = await db.rpc("health_history", {
      p_since: since,
      p_bucket: bucket,
      p_service: serviceParam,
    });
    if (error) throw error;

    // Group rows by bucket timestamp (use numeric ms to avoid ISO format mismatch)
    const typedRows = ((rows ?? []) as HealthHistoryRow[]).filter((row) =>
      (SERVICES as readonly string[]).includes(row.service),
    );
    const byBucket = new Map<number, HealthHistoryRow[]>();
    for (const row of typedRows) {
      const ts = new Date(row.bucket).getTime();
      if (!byBucket.has(ts)) byBucket.set(ts, []);
      byBucket.get(ts)!.push(row);
    }

    const series = Array.from({ length: bucketCount }, (_, i) => {
      const bucketStartMs = windowStart + i * bucketMs;
      const bucketKey = new Date(bucketStartMs).toISOString();
      const bucketRows = byBucket.get(bucketStartMs) ?? [];
      const perService: Record<string, BucketStats | null> = {};
      for (const s of services) {
        const r = bucketRows.find((row) => row.service === s);
        perService[s] = r
          ? {
              checks: r.checks,
              uptimePct: r.checks > 0 ? Math.round((r.ok / r.checks) * 1000) / 10 : null,
              avgLatencyMs: r.avg_latency,
              incidents: r.checks - r.ok,
            }
          : null;
      }
      return { start: bucketKey, services: perService };
    });

    const summary: Record<string, BucketStats> = {};
    for (const s of services) {
      const sRows = typedRows.filter((r) => r.service === s);
      const totalChecks = sRows.reduce((a, r) => a + r.checks, 0);
      const totalOk = sRows.reduce((a, r) => a + r.ok, 0);
      const totalLatency = sRows.reduce((a, r) => a + r.avg_latency * r.checks, 0);
      summary[s] = {
        checks: totalChecks,
        uptimePct: totalChecks > 0 ? Math.round((totalOk / totalChecks) * 1000) / 10 : null,
        avgLatencyMs: totalChecks > 0 ? Math.round(totalLatency / totalChecks) : 0,
        incidents: totalChecks - totalOk,
      };
    }

    const response = {
      service: serviceParam ?? "all",
      range,
      bucket,
      series,
      summary,
    };
    historyCache.set(cacheKey, { at: Date.now(), response });
    return successResponse(response);
  } catch (err) {
    console.error("[Status/History] Error:", err);
    return serverErrorResponse();
  }
}
