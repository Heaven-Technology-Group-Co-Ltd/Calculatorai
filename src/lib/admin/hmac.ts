/**
 * HMAC-SHA256 Signature Verification Module
 *
 * Security: Every API request from the Discord Bot to this Next.js server
 * MUST carry a valid HMAC signature in the `x-signature` header.
 * This prevents forged requests — even if someone discovers the API URL,
 * they cannot execute commands without the shared secret.
 *
 * How it works:
 *  1. The bot creates a JSON payload and computes HMAC-SHA256(payload, secret).
 *  2. It sends the payload + signature to this server.
 *  3. This server recomputes the HMAC and rejects mismatches immediately.
 */

import { createHmac, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Headers that the Discord Bot is expected to send */
export interface AdminApiHeaders {
  /** Hex-encoded HMAC-SHA256 signature of the request body */
  "x-signature": string;
  /** Epoch ms timestamp to prevent replay attacks */
  "x-timestamp": string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Shared secret — must match EXACTLY between the Discord Bot and this server.
 * Loaded from environment; server refuses to start without it.
 */
const SHARED_SECRET = process.env.ADMIN_API_SHARED_SECRET;

/** Acceptable clock-skew window (5 minutes) to account for minor time drift */
const MAX_AGE_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute HMAC-SHA256 hex digest of an arbitrary string payload.
 *
 * @param payload - Raw string (typically `JSON.stringify(body)`)
 * @param secret  - Shared secret; falls back to env variable
 * @returns Hex-encoded HMAC digest
 */
export function createHmacSignature(payload: string, secret = SHARED_SECRET): string {
  if (!secret) {
    throw new Error(
      "ADMIN_API_SHARED_SECRET is not configured. Cannot create HMAC signature."
    );
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify an incoming request's HMAC signature.
 *
 * The signature covers the JSON payload, the caller identity (callerId +
 * callerTag), and the epoch-ms timestamp, so an attacker cannot tamper with
 * the headers in transit or replay a captured request with a fresh timestamp.
 *
 * Security measures:
 *  1. **Secret existence check** — refuses to verify if secret is unset.
 *  2. **Timestamp freshness** — rejects requests older than 5 min or from the
 *     future (replay + clock-skew protection).
 *  3. **Constant-time comparison** — `timingSafeEqual` prevents timing attacks
 *     where an attacker infers the correct signature byte-by-byte by measuring
 *     response times.
 *
 * @param rawBody   - The raw request body string (before JSON parsing!)
 * @param signature - Hex signature from `x-signature` header
 * @param timestamp - Epoch-ms timestamp from `x-timestamp` header
 * @param callerId  - Discord user ID from `x-caller-id` header (bound into signature)
 * @param callerTag - Discord tag from `x-caller-tag` header (bound into signature)
 * @returns `true` if the signature is valid and fresh, `false` otherwise
 */
export function verifyHmacSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  callerId?: string,
  callerTag?: string
): boolean {
  // 1. Secret must be configured
  if (!SHARED_SECRET) {
    console.error("[ADMIN HMAC] ADMIN_API_SHARED_SECRET is not set!");
    return false;
  }

  // 2. Reject stale or future-dated requests (replay / clock-skew prevention)
  const ts = Number(timestamp);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    console.warn("[ADMIN HMAC] Request timestamp is stale, future-dated, or invalid.");
    return false;
  }

  // 3. Reconstruct the signed data: { ...payload, callerId, callerTag, timestamp }
  //    This must match the bot-side signRequest() exactly. Binding the
  //    timestamp into the signature means a captured request cannot be
  //    replayed with a forged fresh timestamp header.
  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return false;
  }
  const signedData = JSON.stringify({
    ...parsedBody,
    callerId: callerId ?? "",
    callerTag: callerTag ?? "",
    timestamp,
  });

  // 4. Recompute HMAC and compare in constant time
  const expectedSig = createHmacSignature(signedData);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expectedSig, "hex");

  // Safety: buffers must be same length for timingSafeEqual
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
