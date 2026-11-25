import { NextRequest, NextResponse } from "next/server";
import { checkAdminGate, type AdminGateFailure } from "./admin-gate";
import {
  forbiddenResponse,
  rateLimitedResponse,
  serviceUnavailableResponse,
  unauthorizedResponse,
} from "../api-response";
import { getClientIpFromHeaders } from "../client-ip";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  is_admin: boolean;
}

export class AdminGateError extends Error {
  readonly kind: AdminGateFailure["kind"];
  readonly status: AdminGateFailure["status"];

  constructor(failure: AdminGateFailure) {
    super(failure.message);
    this.name = "AdminGateError";
    this.kind = failure.kind;
    this.status = failure.status;
  }
}

/**
 * Extract client IP for rate-limit keys.
 * ponytail: delegates to getClientIpFromHeaders — rightmost XFF hop,
 * valid only when exactly one trusted proxy is adjacent; with N trusted
 * layers the anchor should be hops[hops.length - N].
 */
export function getClientIp(request: NextRequest): string {
  return getClientIpFromHeaders(request.headers);
}

export async function requireAdmin(request: NextRequest): Promise<AdminUser> {
  const result = await checkAdminGate(request, {
    rateLimitKey: `admin:${getClientIp(request)}`,
  });

  if (!result.ok) throw new AdminGateError(result.failure);
  return result.user;
}

export function adminGateErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AdminGateError)) return null;

  switch (error.kind) {
    case "unauthenticated":
      return unauthorizedResponse(error.message);
    case "forbidden":
      return forbiddenResponse(error.message);
    case "rate_limited":
      return rateLimitedResponse(error.message);
    case "unavailable":
      return serviceUnavailableResponse(error.message);
  }
}
