/**
 * Admin API Client — Discord Bot ➡️ Next.js
 *
 * Typed client for the centralized `/api/admin/control` route.
 * Every method internally:
 *  1. Validates the payload shape with Zod (client-side).
 *  2. Signs the request with HMAC-SHA256.
 *  3. Sends the request with axios.
 *  4. Returns the typed result or throws on error.
 */

import axios, { AxiosError } from "axios";
import { z } from "zod/v4";
import { signRequest } from "./hmac";
import { ADMIN_CONTROL_ACTIONS, type AdminControlAction, type AdminControlRequest, type AdminControlResponses } from "../contracts/admin-control";

// ---------------------------------------------------------------------------
// Zod schemas (must match Next.js server-side schemas exactly)
// ---------------------------------------------------------------------------

const AdminPayload = z.discriminatedUnion("action", [
  z.object({ action: z.literal(ADMIN_CONTROL_ACTIONS[0]), scope: z.enum(["users", "system", "all"]).default("all") }).strict(),
  z.object({ action: z.literal(ADMIN_CONTROL_ACTIONS[1]), enabled: z.boolean(), message: z.string().max(500).optional() }).strict(),
  z.object({ action: z.literal(ADMIN_CONTROL_ACTIONS[2]), content: z.string().min(1).max(2000), target: z.enum(["all", "web", "discord"]).default("all") }).strict(),
]);

type AdminPayload = z.infer<typeof AdminPayload>;

// Response types
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function getControlUrl(): string {
  const rawUrl = process.env.NEXTJS_API_URL?.trim();
  if (!rawUrl) {
    throw new Error("NEXTJS_API_URL is not configured");
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("NEXTJS_API_URL must be a valid http:// or https:// URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("NEXTJS_API_URL must use http:// or https://");
  }
  return `${parsed.origin}/api/admin/control`;
}

/**
 * Send a signed admin command to the Next.js API.
 *
 * @param payload  - The action to execute (validated via Zod)
 * @param callerId  - Discord user ID
 * @param callerTag - Discord tag
 * @returns The response data from the server
 * @throws Error if the request or validation fails
 */
export async function sendAdminCommand<A extends AdminControlAction>(
  payload: Extract<AdminControlRequest, { action: A }>,
  callerId: string,
  callerTag: string
): Promise<AdminControlResponses[A]> {
  // 1. Client-side Zod validation before sending
  const parsed = AdminPayload.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid payload: ${issues}`);
  }

  // 2. Sign the payload (HMAC) — signature covers action + caller identity
  const { signature, timestamp } = signRequest(
    parsed.data satisfies Record<string, unknown>,
    callerId,
    callerTag
  );

  // 3. Send with axios
  const controlUrl = getControlUrl();
  try {
    const response = await axios.post<ApiResponse<AdminControlResponses[A]>>(
      controlUrl,
      parsed.data,
      {
        headers: {
          "Content-Type": "application/json",
          "x-signature": signature,
          "x-timestamp": timestamp,
          "x-caller-id": callerId,
          "x-caller-tag": callerTag,
        },
        timeout: 10_000, // 10 s timeout
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error ?? "Unknown API error");
    }

    return response.data.data as AdminControlResponses[A];
  } catch (err) {
    if (err instanceof AxiosError) {
      const serverMsg = (err.response?.data as ApiResponse | undefined)?.error;
      throw new Error(serverMsg ?? `HTTP ${err.response?.status}: ${err.message}`);
    }
    throw err;
  }
}
