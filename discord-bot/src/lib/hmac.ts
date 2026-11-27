/**
 * HMAC-SHA256 Request Signer — Discord Bot Side
 *
 * Every outbound request to the Next.js Admin API is signed with this module.
 * The server will verify the signature before executing any command.
 *
 * How it works:
 *  1. Serialize the action payload to a deterministic JSON string.
 *  2. Compute HMAC-SHA256(payload, secret).
 *  3. Attach signature + timestamp as HTTP headers.
 *
 * The server (Next.js) recomputes the same HMAC and rejects any request
 * whose signature doesn't match — preventing forged or tampered commands.
 */

import { createHmac } from "crypto";
import { buildAdminCanonicalPayload } from "../contracts/admin-control";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SHARED_SECRET = process.env.ADMIN_API_SHARED_SECRET!;

if (!SHARED_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error(
    "ADMIN_API_SHARED_SECRET is not set! The bot cannot sign requests without it."
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignedRequestPayload {
  /** HMAC-SHA256 hex signature of the body */
  signature: string;
  /** Epoch-milliseconds timestamp (replay protection) */
  timestamp: string;
  /** Discord user ID of the person issuing the command */
  callerId: string;
  /** Discord tag (e.g. "Alice#1234") for human-readable logs */
  callerTag: string;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Sign a payload for the Next.js Admin API.
 *
 * The signature covers the action payload, the caller identity
 * (callerId + callerTag), and the epoch-ms timestamp, so headers cannot be
 * tampered in transit and a captured request cannot be replayed with a
 * fresh timestamp (server verifies the timestamp inside the signature).
 *
 * @param payload - The action object to sign (will be JSON-serialized)
 * @param callerId  - Discord user ID (bound into the signature)
 * @param callerTag - Discord tag (bound into the signature)
 * @returns Headers to attach to the HTTP request
 */
export function signRequest(
  payload: Record<string, unknown>,
  callerId: string,
  callerTag: string
): SignedRequestPayload {
  const timestamp = Date.now().toString();

  // Include caller identity AND the timestamp in the signed data so the
  // server can verify headers haven't been tampered with mid-transit and a
  // captured signature cannot be replayed with a forged fresh timestamp.
  const signedData = buildAdminCanonicalPayload(timestamp, callerId, JSON.stringify(payload), callerTag);
  const signature = createHmac("sha256", SHARED_SECRET).update(signedData).digest("hex");

  return { signature, timestamp, callerId, callerTag };
}
