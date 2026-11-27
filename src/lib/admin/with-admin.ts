import { NextRequest, NextResponse } from "next/server";
import { checkAdminGate } from "./admin-gate";
import { withAuditLog, type AuditEntry } from "./audit";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { ApiError, toErrorResponse } from "@/lib/api-response";
import type { AdminUser } from "./auth-middleware";

interface AdminContext {
  admin: AdminUser;
  supabase: ReturnType<typeof getSupabaseAdmin>;
  audit: <T>(entry: Omit<AuditEntry, "adminUserId">, effect: () => Promise<T>) => Promise<T>;
}

export async function withAdmin(
  request: NextRequest,
  handler: (context: AdminContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const gate = await checkAdminGate(request, {
      rateLimitKey: `admin:${getClientIpFromHeaders(request.headers)}`,
    });
    if (!gate.ok) {
      const codes = { 401: "UNAUTHORIZED", 403: "FORBIDDEN", 429: "RATE_LIMITED", 503: "SERVICE_UNAVAILABLE" } as const;
      const failure = gate.failure;
      return toErrorResponse(new ApiError(failure.status, codes[failure.status], failure.message, failure.headers));
    }
    return await handler({
      admin: gate.user,
      supabase: getSupabaseAdmin(),
      audit: (entry, effect) => withAuditLog({ ...entry, adminUserId: gate.user.id }, effect),
    });
  } catch (error) {
    return toErrorResponse(error, { routeTag: `${request.method} ${request.nextUrl.pathname}` });
  }
}
