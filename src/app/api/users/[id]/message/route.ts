import { withAdmin } from "@/lib/admin/with-admin";
import { NextRequest, NextResponse } from "next/server";
import { AdminMessageSchema } from "@/lib/admin/schemas";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * POST /api/users/[id]/message
 * Send an admin message to a user.
 * Admin only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, {}, async ({ supabase, admin, audit }) => {

    const { id } = await params;
    const body = await request.json();
    const parsed = AdminMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const data = await audit({ action: "admin_message", targetType: "user", targetId: id }, async () => {
      const { data: message, error } = await supabase.from("admin_messages").insert({ user_id: id, content: parsed.data.content, sent_by: admin.id }).select().single();
      if (error) throw new Error(error.message);
      return message;
    });
    return successResponse(data);
  });
}
