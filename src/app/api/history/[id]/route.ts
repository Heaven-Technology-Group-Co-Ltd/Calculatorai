/**
 * DELETE /api/history/[id]
 *
 * Delete a specific history entry (owner only).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";

/** Extract user id from session */
function getUserId(session: unknown): string | null {
  const s = session as { user?: { id?: string } } | null;
  return s?.user?.id ?? null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    if (!id) {
      return badRequestResponse("Missing history item ID");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calculation_history")
      .delete()
      .eq("id", id)
      .eq("user_id", userId) // owner guard
      .select()
      .single();

    if (error) {
      // No rows deleted = not found or not owned
      return notFoundResponse("History entry not found");
    }

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[HistoryItem] DELETE error:", err);
    return serverErrorResponse("Internal server error");
  }
}
