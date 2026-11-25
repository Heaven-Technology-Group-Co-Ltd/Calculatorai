/**
 * Log Dispatcher System — Web ➡️ Discord Webhook
 *
 * Sends rich, colour-coded embed messages to a dedicated Discord admin channel.
 * Every significant server event (stats request, maintenance toggle, error)
 * is logged here so admins have full visibility without SSH-ing into the box.
 *
 * Usage:
 *   import { sendAdminLog } from "@/lib/admin/log-dispatcher";
 *   await sendAdminLog("maintenance_on", { user: "Alice" }, "WARN");
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

export interface LogDetails {
  [key: string]: string | number | boolean | null | undefined;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WEBHOOK_URL = process.env.DISCORD_ADMIN_WEBHOOK_URL;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

/** Colour map: severity → Discord embed colour integer */
const LEVEL_COLORS: Record<LogLevel, number> = {
  INFO: 0x3498db,    // Blue
  WARN: 0xf39c12,    // Orange
  ERROR: 0xe74c3c,   // Red
  SUCCESS: 0x2ecc71, // Green
};

/** Emoji prefix per level for instant visual scanning */
const LEVEL_EMOJI: Record<LogLevel, string> = {
  INFO: "ℹ️",
  WARN: "⚠️",
  ERROR: "🔴",
  SUCCESS: "✅",
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a `details` key-value map into Discord embed fields (max 25).
 * Values are clamped to 1024 chars (Discord field value limit).
 */
function detailsToFields(details: LogDetails): { name: string; value: string; inline: boolean }[] {
  return Object.entries(details)
    .slice(0, 25)                       // Discord hard limit
    .map(([name, val]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: `\`${String(val ?? "N/A")}\``.slice(0, 1024),
      inline: true,
    }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a rich embed log message to the Discord admin webhook.
 *
 * This function is **fire-and-forget safe**: it catches all errors internally
 * and does NOT throw. This ensures logging failures never crash the application.
 *
 * @param event   - Short machine-readable event key (e.g. `"maintenance_on"`)
 * @param details - Key-value pairs to display as embed fields
 * @param level   - Severity level controlling colour + emoji
 */
export async function sendAdminLog(
  event: string,
  details: LogDetails,
  level: LogLevel = "INFO"
): Promise<void> {
  if (!WEBHOOK_URL) {
    // Gracefully degrade — log to console if webhook is not configured
    console.warn("[AdminLog] DISCORD_ADMIN_WEBHOOK_URL is not set. Skipping Discord log.");
    console.log(`[AdminLog] ${level} ${event}`, details);
    return;
  }

  const payload = {
    username: "Admin Monitor",
    avatar_url: "https://cdn-icons-png.flaticon.com/512/1827/1827933.png",
    embeds: [
      {
        title: `${LEVEL_EMOJI[level]} ${event.replace(/_/g, " ").toUpperCase()}`,
        color: LEVEL_COLORS[level],
        fields: detailsToFields(details),
        footer: {
          text: `Server: ${process.env.VERCEL_URL || process.env.HOSTNAME || "local"}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  // Retry loop (best-effort delivery)
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "(unreadable)");
        throw new Error(`Discord responded ${res.status}: ${body}`);
      }

      // Success — return early
      return;
    } catch (err) {
      console.error(
        `[AdminLog] Attempt ${attempt}/${MAX_RETRIES + 1} failed for "${event}":`,
        err
      );

      if (attempt <= MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  console.error(`[AdminLog] All retries exhausted for "${event}".`);
}
