/**
 * Standard API Response Helpers
 *
 * All API routes MUST use these helpers to ensure consistent
 * response format across the entire backend.
 *
 * Format: { success: true, data?: T } | { success: false, error: string }
 */

import { NextResponse } from "next/server";

// ── Success Responses ───────────────────────────────────────────────────────

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
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

export function rateLimitedResponse(error = "Too many requests. Please try again later.") {
  return NextResponse.json({ success: false, error }, { status: 429 });
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
