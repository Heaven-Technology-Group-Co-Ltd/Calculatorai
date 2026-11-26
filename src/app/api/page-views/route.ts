/**
 * POST /api/page-views
 *
 * Records page views for dashboard analytics.
 * Called by the client-side page tracker on every navigation.
 *
 * Security:
 *  - Rate limited (60 requests per min per IP)
 *  - No auth required (public analytics)
 *  - Silently skips if table doesn't exist yet (graceful degradation)
 */

import { NextRequest } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { z } from "zod";
import type { TablesInsert } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  badRequestResponse,
  successResponse,
  rateLimitedResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// ── Zod schema ──────────────────────────────────────────────────────────────
const PageViewSchema = z.object({
  path: z.string().max(512, "Path is too long").regex(/^\/(?!\/)[^\x00-\x1f\x7f]*$/, "Invalid path"),
  sessionId: z.string().max(128, "Session id is too long").nullish(),
  referrer: z.string().max(2048).optional(),
});

function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

function geoCountry(value: string | null): string | null {
  if (!value) return null;
  for (const candidate of [value, (() => { try { return Buffer.from(value, "base64").toString("utf8"); } catch { return ""; } })()]) {
    try {
      const geo = JSON.parse(candidate) as { country?: { code?: unknown } };
      const country = normalizeCountry(geo.country?.code);
      if (country) return country;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  return null;
}

function countryFromHeaders(headers: Headers): string | null {
  return normalizeCountry(headers.get("x-nf-country")) ?? geoCountry(headers.get("x-nf-geo"))
    ?? normalizeCountry(headers.get("cf-ipcountry")) ?? normalizeCountry(headers.get("x-vercel-ip-country"));
}

function cleanReferrer(referrer: string | undefined, request: NextRequest): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (!["http:", "https:"].includes(url.protocol) || url.hostname === request.nextUrl.hostname) return null;
    return `${url.origin}${url.pathname}`.slice(0, 255);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting (by IP, 60/min) ──────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const rateResult = await checkRateLimit(`pageview:${ip}`, 60, 60_000);
    if (!rateResult.allowed) {
      return rateLimitedResponse();
    }

    // ── Parse & validate body ─────────────────────────────────────────
    const body = await request.json();
    const parsed = PageViewSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0].message);
    }

    const { path, sessionId, referrer } = parsed.data;
    const userAgent = request.headers.get("user-agent")?.slice(0, 512);
    const supabase = getSupabaseAdmin();

    const pageView: TablesInsert<"page_views"> = {
      path,
      session_id: sessionId ?? null,
      user_agent: userAgent ?? null,
      referrer: cleanReferrer(referrer, request),
      country: countryFromHeaders(request.headers),
    };
    const { error: insertError } = await supabase.from("page_views").insert(pageView);

    if (insertError && insertError.code !== "42P01") {
      // 42P01 = table not yet created by migration — fail gracefully
      console.warn("[PageViews] Insert error:", insertError.message);
      return serverErrorResponse("Failed to record page view");
    }

    return successResponse({ recorded: true });
  } catch (err) {
    console.error("[PageViews] Error:", err);
    return serverErrorResponse("Internal server error");
  }
}
