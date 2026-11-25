/**
 * Bot Heartbeat — periodic liveness signal to Supabase
 *
 * Upserts a row in `bot_heartbeats` every HEARTBEAT_INTERVAL_MS.
 * Status page reads this to determine if the bot process is alive.
 *
 * Interval: 1 hour (responsive detection)
 * Threshold: 2 hours (tolerance for 1 missed beat)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SERVICE_NAME = "discord";

let supabase: SupabaseClient<any> | null = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabase;
}

async function sendHeartbeat(): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from("bot_heartbeats")
    .upsert(
      { service: SERVICE_NAME, last_seen: new Date().toISOString() },
      { onConflict: "service" }
    );
  if (error) {
    console.error("[Heartbeat] Failed:", error.message);
  }
}

export function startHeartbeat(): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[Heartbeat] Missing Supabase env — heartbeat disabled");
    return;
  }

  // Send immediately on startup
  sendHeartbeat().catch((err) => {
    console.error("[Heartbeat] Initial send failed:", err);
  });

  // Then every hour
  setInterval(() => {
    sendHeartbeat().catch((err) => {
      console.error("[Heartbeat] Interval send failed:", err);
    });
  }, HEARTBEAT_INTERVAL_MS);

  console.log(`[Heartbeat] Started — every ${HEARTBEAT_INTERVAL_MS / 3_600_000}h`);
}
