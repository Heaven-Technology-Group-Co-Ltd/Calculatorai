import { NextRequest, NextResponse } from "next/server";
import { checkAdminGate } from "./admin-gate";
import { withAuditLog, type AuditEntry } from "./audit";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { toErrorResponse } from "@/lib/api-response";
import type { AdminUser } from "./auth-middleware";

interface AdminContext {
  admin: AdminUser;
  supabase: ReturnType<typeof getSupabaseAdmin>;
  audit: <T>(entry: Omit<AuditEntry, "adminUserId">, effect: () => Promise<T>) => Promise<T>;
}

export async function withAdmin(
  request: NextRequest,
  options: { rateLimitKey?: string },
  handler: (context: AdminContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const gate = await checkAdminGate(request, {
      rateLimitKey: options.rateLimitKey ?? `admin:${getClientIpFromHeaders(request.headers)}`,
    });
    if (!gate.ok) return NextResponse.json({ success: false, error: gate.failure.message }, { status: gate.failure.status });
    return await handler({
      admin: gate.user,
      supabase: getSupabaseAdmin(),
      audit: (entry, effect) => withAuditLog({ ...entry, adminUserId: gate.user.id }, effect),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
