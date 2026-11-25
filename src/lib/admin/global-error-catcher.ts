/**
 * Global Error Catcher Module
 *
 * Catches unhandled server-side errors and automatically dispatches them
 * to the Discord admin channel via webhook so admins are notified in real-time.
 *
 * Integration points:
 *  1. Call `installGlobalErrorCatcher()` once during app startup (e.g. in
 *     `instrumentation.ts` or top of `layout.tsx` for client-side errors).
 *  2. Use `catchAndReport(err)` in any async server action or API route for
 *     explicit error capture with context.
 */

import { sendAdminLog } from "@/lib/admin/log-dispatcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorContext {
  /** Where the error occurred (e.g. "api/checkout", "action/sendEmail") */
  source?: string;
  /** Any additional context key-value pairs */
  extra?: Record<string, string | number | boolean | undefined>;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Prevent infinite loops if the webhook itself throws */
let isReporting = false;

/** Deduplicate: don't report the same error message within a short window */
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 30_000; // 30 s

function shouldReport(errorKey: string): boolean {
  const lastSeen = recentErrors.get(errorKey);
  if (lastSeen && Date.now() - lastSeen < DEDUP_WINDOW_MS) {
    return false;
  }
  recentErrors.set(errorKey, Date.now());

  // Prevent unbounded growth
  if (recentErrors.size > 100) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [k, v] of recentErrors) {
      if (v < cutoff) recentErrors.delete(k);
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Catch an arbitrary error, format it, and send to Discord.
 * Safe to call from anywhere — never throws.
 */
export async function catchAndReport(
  err: unknown,
  context: ErrorContext = {}
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack  = err instanceof Error ? err.stack  : undefined;
  const errorKey = `${context.source ?? "unknown"}:${message}`;

  if (!shouldReport(errorKey)) return;
  if (isReporting) return;

  isReporting = true;
  try {
    await sendAdminLog("server_error", {
      source:   context.source ?? "unknown",
      message:  message.slice(0, 500),
      stack:    stack?.slice(0, 1024) ?? "N/A",
      ...context.extra,
    }, "ERROR");
  } catch {
    // Last resort: console only
    console.error("[GlobalErrorCatcher] Failed to send to Discord:", err);
  } finally {
    isReporting = false;
  }
}

/**
 * Install global process-level error handlers.
 * Call this ONCE during application startup.
 */
export function installGlobalErrorCatcher(): void {
  // Handle uncaught synchronous exceptions
  process.on("uncaughtException", (err) => {
    void catchAndReport(err, { source: "uncaughtException" });
  });

  // Handle rejected promises that nobody awaited / .catch()-ed
  process.on("unhandledRejection", (reason) => {
    void catchAndReport(reason instanceof Error ? reason : new Error(String(reason)), {
      source: "unhandledRejection",
    });
  });
}
