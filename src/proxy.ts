import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkAdminGate } from "@/lib/admin/admin-gate";
import { mapDashboardGateResult } from "@/lib/admin/dashboard-gate-mapping";

/**
 * Security middleware — runs on every request before routes are matched.
 *
 * Applies:
 *  1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 *  2. CSRF token validation for admin POST requests
 *  3. Admin path protection header signals
 */
export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/dashboard" || request.nextUrl.pathname.startsWith("/dashboard/")) {
    const gateResult = await checkAdminGate(request);
    const action = mapDashboardGateResult(gateResult);

    if (action.kind === "redirect") {
      return NextResponse.redirect(new URL(action.destination, request.url));
    }
    if (action.kind === "unavailable") {
      return NextResponse.json(
        { success: false, error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
  }

  const response = NextResponse.next();

  // Preserve the route's real status code from the dashboard gate.

  // ── 1. Security Headers ──────────────────────────────────────────────
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy — restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Cache-Control — prevent CDN caching of HTML pages
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate"
  );

  // HSTS — force HTTPS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // ── 2. CSRF Protection for Admin Mutating Requests ──────────────────
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    (request.nextUrl.pathname.startsWith("/api/analytics/report") ||
      request.nextUrl.pathname.startsWith("/api/users") ||
      request.nextUrl.pathname.startsWith("/api/settings") ||
      request.nextUrl.pathname.startsWith("/api/finance"))
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    let sameHost = false;
    if (origin && host) {
      try {
        sameHost = new URL(origin).host === host;
      } catch {
        sameHost = false;
      }
    }
    if (!origin || !host || !sameHost) {
      return NextResponse.json(
        { success: false, error: "CSRF validation failed" },
        { status: 403 }
      );
    }
  }

  return response;
}

// Run middleware on all paths except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
