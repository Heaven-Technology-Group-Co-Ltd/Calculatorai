import { FIELD_LIMITS } from "@/lib/validation/vocabulary";
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
import { readMaintenanceState } from "@/lib/admin/state";
import { NextResponse as MaintenanceResponse } from "next/server";
/**
 * History API — Premium Math Calculator
 *
 * GET    /api/history          — List history for authenticated user
 * POST   /api/history          — Create history entry
 * DELETE /api/history          — Clear all history for user
 *
 * All endpoints require authentication.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { successResponse, createdResponse, unauthorizedResponse, badRequestResponse, serverErrorResponse,  } from "@/lib/api-response";
import { encodeHistoryPayload } from "@/lib/history-payload";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract user id from session */
function getUserId(session: unknown): string | null {
  const s = session as { user?: { id?: string } } | null;
  return s?.user?.id ?? null;
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const CreateHistorySchema = z.object({
  calcId: z.string().min(1, "Calculation id is required").max(FIELD_LIMITS.historyExpression),
  calcTitle: z.string().min(1, "Calculation title is required").max(FIELD_LIMITS.historyExpression),
  inputs: z.record(z.string().max(64), z.string().max(1024)).refine((entries) => Object.keys(entries).length <= 32),
  result: z.string().min(1).max(FIELD_LIMITS.historyResult),
  unit: z.string().max(1024),
});

// ── GET ─────────────────────────────────────────────────────────────────────
// Returns history for the authenticated user, newest first, max 100.

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calculation_history")
      .select("id, user_id, expression, result, timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[History] GET error:", error.message);
      return serverErrorResponse("Failed to fetch history");
    }

    return successResponse(data ?? []);
  } catch (err) {
    console.error("[History] GET unexpected error:", err);
    return serverErrorResponse("Internal server error");
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
// Creates a history entry for the authenticated user.

export async function POST(request: NextRequest) {
  if ((await readMaintenanceState()).maintenanceMode) {
    return MaintenanceResponse.json({ success: false, error: "System is currently under maintenance" }, { status: 503 });
  }
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return unauthorizedResponse();
    }

    const quota = await enforceRateLimit(RATE_LIMIT_POLICIES.HISTORY_WRITE_USER, userId, { throttleMessage: "Too many requests" });
    if (!quota.ok) return quota.response;

    const body = await request.json();
    const parsed = CreateHistorySchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return badRequestResponse(`Validation failed: ${issues}`);
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("calculation_history")
      .insert({
        user_id: userId,
        expression: encodeHistoryPayload(parsed.data),
        result: parsed.data.result,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[History] POST error:", error.message);
      return serverErrorResponse("Failed to create history entry");
    }

    return createdResponse(data);
  } catch (err) {
    console.error("[History] POST unexpected error:", err);
    return serverErrorResponse("Internal server error");
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
// Clears ALL history for the authenticated user.

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("calculation_history")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[History] DELETE error:", error.message);
      return serverErrorResponse("Failed to clear history");
    }

    return successResponse({ cleared: true });
  } catch (err) {
    console.error("[History] DELETE unexpected error:", err);
    return serverErrorResponse("Internal server error");
  }
}
