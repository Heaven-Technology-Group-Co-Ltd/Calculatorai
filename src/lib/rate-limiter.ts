import { getSupabaseAdmin } from "./supabase-client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  return checkWithPolicy(key, limit, windowMs, true);
}

export function checkRateLimitStrict(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  return checkWithPolicy(key, limit, windowMs, false);
}

function summarize(allowed: boolean, count: number, resetAt: string, limit: number): RateLimitResult {
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfter: allowed ? 0 : Math.max(1, Math.ceil((Date.parse(resetAt) - Date.now()) / 1000)),
  };
}

async function checkWithPolicy(key: string, limit: number, windowMs: number, failOpen: boolean): Promise<RateLimitResult> {
  try {
    const { data: entries, error } = await getSupabaseAdmin().rpc("consume_rate_limit", {
      p_identifier: key, p_limit: limit, p_window_ms: windowMs,
    });
    if (error && (error.code === "PGRST202" || error.code === "42883")) return await fallback(key, limit, windowMs);
    if (error) throw error;
    const entry = entries?.[0];
    if (!entry) throw new Error("Rate limit RPC returned no row");
    return summarize(entry.allowed, entry.current_count, entry.reset_at, limit);
  } catch (error) {
    if (!failOpen) throw error;
    console.warn("Rate limiter DB error (fail-open):", error);
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

async function fallback(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = getSupabaseAdmin();
  const nextReset = new Date(Date.now() + windowMs).toISOString();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: existing, error: readError } = await client.from("rate_limits")
      .select("identifier, count, reset_at").eq("identifier", key)
      .order("reset_at", { ascending: false }).limit(1).maybeSingle();
    if (readError) throw readError;
    if (!existing) {
      const { error } = await client.from("rate_limits").insert({ identifier: key, count: 1, reset_at: nextReset });
      if (error?.code === "23505") continue;
      if (error) throw error;
      return summarize(true, 1, nextReset, limit);
    }
    const expired = Date.parse(existing.reset_at) <= Date.now();
    if (!expired && existing.count >= limit) return summarize(false, existing.count, existing.reset_at, limit);
    const count = expired ? 1 : existing.count + 1;
    const resetAt = expired ? nextReset : existing.reset_at;
    const { data: updated, error } = await client.from("rate_limits")
      .update({ count, reset_at: resetAt }).eq("identifier", key)
      .eq("count", existing.count).eq("reset_at", existing.reset_at).select("identifier");
    if (error) throw error;
    if (updated?.length) return summarize(true, count, resetAt, limit);
  }
  return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
}

export async function cleanupRateLimits(): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("cleanup_expired_rate_limits");
  if (error) {
    const { error: deleteError } = await getSupabaseAdmin().from("rate_limits").delete().lt("reset_at", new Date().toISOString());
    if (deleteError) throw deleteError;
  }
}
