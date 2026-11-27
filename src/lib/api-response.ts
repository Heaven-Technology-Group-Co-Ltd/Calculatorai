/**
 * Standard API Response Helpers
 *
 * All API routes MUST use these helpers to ensure consistent
 * response format across the entire backend.
 *
 * Format: { success: true, data?: T } | { success: false, error: string }
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminGateError } from "@/lib/admin/auth-middleware";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly headers?: Record<string, string>,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string) { return new ApiError(400, "BAD_REQUEST", message); }
  static unauthorized(message: string) { return new ApiError(401, "UNAUTHORIZED", message); }
  static forbidden(message: string) { return new ApiError(403, "FORBIDDEN", message); }
  static notFound(message: string) { return new ApiError(404, "NOT_FOUND", message); }
  static unprocessable(message: string) { return new ApiError(422, "UNPROCESSABLE", message); }
  static tooManyRequests(message: string, headers?: Record<string, string>) { return new ApiError(429, "RATE_LIMITED", message, headers); }
  static unavailable(message: string) { return new ApiError(503, "UNAVAILABLE", message); }
  static internal(message: string) { return new ApiError(500, "INTERNAL_ERROR", message); }
}

export function toErrorResponse(error: unknown, fallbackMessage = "Internal server error"): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, ...(error.details === undefined ? {} : { details: error.details }) },
      { status: error.status, headers: error.headers },
    );
  }
  if (error instanceof AdminGateError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  if (error instanceof ZodError) return badRequestResponse("Invalid request");
  console.error("[API] Unexpected error");
  return serverErrorResponse(fallbackMessage);
}

// ── Success Responses ───────────────────────────────────────────────────────

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

// ── Error Responses ─────────────────────────────────────────────────────────

export function badRequestResponse(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function unauthorizedResponse(error = "Authentication required") {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbiddenResponse(error = "Insufficient permissions") {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function notFoundResponse(error = "Resource not found") {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function rateLimitedResponse(error = "Too many requests. Please try again later.", retryAfter?: number) {
  const headers = retryAfter === undefined ? undefined : { "Retry-After": String(retryAfter) };
  return NextResponse.json({ success: false, error }, { status: 429, headers });
}

export function serverErrorResponse(error = "Internal server error") {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

export function badGatewayResponse(error = "External service temporarily unavailable") {
  return NextResponse.json({ success: false, error }, { status: 502 });
}

export function serviceUnavailableResponse(error = "Service temporarily unavailable. Please try again shortly.") {
  return NextResponse.json({ success: false, error }, { status: 503 });
}
