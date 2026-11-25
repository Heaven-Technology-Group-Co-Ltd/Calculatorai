import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { AdminMessageSchema } from "@/lib/admin/schemas";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/message
 * Send an admin message to a user.
 * Admin only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = AdminMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const { data, error } = await supabase.from("admin_messages").insert({ user_id: id, content: parsed.data.content, sent_by: admin.id }).select().single();
    if (error) throw new Error(error.message);

    void writeAuditLog({ adminUserId: admin.id, action: "admin_message", targetType: "user", targetId: id });
    return successResponse(data);
  } catch (err) {
    console.error("[Admin Message] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
