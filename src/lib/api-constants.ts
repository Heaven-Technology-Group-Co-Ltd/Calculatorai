/**
 * Shared API Constants
 *
 * Centralizes magic numbers used across API routes.
 * Prevents duplication and ensures consistency.
 */

// ── Time constants (milliseconds) ──────────────────────────────────────────
export const ONE_MINUTE_MS = 60_000;
export const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;
export const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

// ── Rate limiting defaults ──────────────────────────────────────────────────
export const RATE_LIMIT = {
  /** Admin endpoints */
  ADMIN: { limit: 60, windowMs: ONE_MINUTE_MS },
} as const;

// ── Pagination defaults ─────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

// ── Auth ────────────────────────────────────────────────────────────────────
export const AUTH = {
  BCRYPT_SALT_ROUNDS: 12,
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
  SESSION_VERSION_INTERVAL_MS: 1000,
} as const;
