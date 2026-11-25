import { NextRequest } from "next/server";
import { successResponse, serverErrorResponse } from "@/lib/api-response";
import {
  AdminGateError,
  adminGateErrorResponse,
  getClientIp,
} from "@/lib/admin/auth-middleware";
import { checkAdminGate } from "@/lib/admin/admin-gate";

export async function GET(request: NextRequest) {
  try {
    const result = await checkAdminGate(request, {
      rateLimitKey: `admin-check:${getClientIp(request)}`,
    });
    if (!result.ok) {
      return adminGateErrorResponse(new AdminGateError(result.failure)) ?? serverErrorResponse();
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
