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
  path: z.string().min(1, "Path is required").max(2048, "Path is too long"),
  sessionId: z.string().max(128, "Session id is too long").optional(),
});

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

    const { path, sessionId } = parsed.data;
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const supabase = getSupabaseAdmin();

    const { error: insertError } = await supabase.from("page_views").insert({
      path,
      session_id: sessionId ?? null,
      user_agent: userAgent ?? null,
    });

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
