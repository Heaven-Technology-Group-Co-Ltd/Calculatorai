/**
 * Supabase-backed rate limiter for API routes.
 *
 * Replaces the previous in-memory Map-based limiter so that rate limit
 * state is shared across all server instances (horizontal scaling).
 *
 * Uses a `rate_limits` table in Supabase with automatic cleanup of
 * expired entries.
 *
 * Fallback: if Supabase is unreachable, allows the request through
 * (fail-open) so that a DB outage doesn't block all traffic.
 */

import { getSupabaseAdmin } from "./supabase-client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Check whether a request should be rate-limited.
 *
 * @param key   - Unique identifier (usually "prefix:IP")
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  return checkRateLimitWithPolicy(key, limit, windowMs, true);
}

export function checkRateLimitStrict(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  return checkRateLimitWithPolicy(key, limit, windowMs, false);
}

async function checkRateLimitWithPolicy(
  key: string,
  limit: number,
  windowMs: number,
  failOpen: boolean
): Promise<RateLimitResult> {
  const now = new Date();

  try {
    return await updateRateLimit(key, limit, windowMs, now);
  } catch (err) {
    if (!failOpen) throw err;
    // Fail-open: if Supabase is unreachable, allow the request
    console.warn("Rate limiter DB error (fail-open):", err);
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

async function updateRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: Date
): Promise<RateLimitResult> {
  const resetAt = new Date(now.getTime() + windowMs);

  // Upsert approach: try to read existing entry
  const { data: existing, error: readErr } = await getSupabaseAdmin()
    .from("rate_limits")
    .select("count, reset_at")
    .eq("identifier", key)
    .single();

  if (readErr && readErr.code !== "PGRST116") {
    throw readErr;
  }

  // Entry doesn't exist or has expired — create fresh
  if (!existing || new Date(existing.reset_at) < now) {
    const { error: upsertErr } = await getSupabaseAdmin()
      .from("rate_limits")
      .upsert({
        identifier: key,
        count: 1,
        reset_at: resetAt.toISOString(),
      });

    if (upsertErr) throw upsertErr;
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  // Entry exists and is active — check limit
  if (existing.count >= limit) {
    const retryAfterMs = new Date(existing.reset_at).getTime() - now.getTime();
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  // Increment count
  const { error: updateErr } = await getSupabaseAdmin()
    .from("rate_limits")
    .update({
      count: existing.count + 1,
    })
    .eq("identifier", key);

  if (updateErr) throw updateErr;
  return { allowed: true, remaining: limit - existing.count - 1, retryAfter: 0 };
}

/**
 * Clean up expired rate limit entries.
 * Call this periodically (e.g., from a cron job or on a schedule).
 */
export async function cleanupRateLimits(): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("cleanup_expired_rate_limits");
  if (error) {
    // Fallback: direct delete if RPC not available
    await getSupabaseAdmin().from("rate_limits").delete().lt("reset_at", new Date().toISOString());
  }
}
