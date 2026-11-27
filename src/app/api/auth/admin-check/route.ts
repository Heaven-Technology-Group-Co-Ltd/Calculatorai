import { NextRequest, NextResponse } from "next/server";
import { successResponse, serverErrorResponse } from "@/lib/api-response";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { checkAdminGate } from "@/lib/admin/admin-gate";

export async function GET(request: NextRequest) {
  try {
    const result = await checkAdminGate(request, {
      rateLimitKey: `admin-check:${getClientIpFromHeaders(request.headers)}`,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.failure.message }, { status: result.failure.status });
    }

    const { user } = result;
    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
    });
  } catch (error) {
    console.error("[AdminCheck] Error:", error);
    return serverErrorResponse();
  }
}
