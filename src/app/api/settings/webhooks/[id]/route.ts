import { withAdmin } from "@/lib/admin/with-admin";
import { NextRequest, NextResponse } from "next/server";
import { UpdateWebhookSchema } from "@/lib/admin/schemas";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * PUT /api/settings/webhooks/[id]
 * Update an existing Discord webhook.
 * Admin only.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, {}, async ({ supabase, audit }) => {

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateWebhookSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.url) updateData.url = parsed.data.url;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.event_type) updateData.event_type = parsed.data.event_type;

    const data = await audit({ action: "update_webhook", targetType: "webhook", targetId: id }, async () => {
    const { data, error } = await supabase.from("discord_webhooks").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(error.message);

      return data;
    });
    return successResponse(data);
  });
}

/**
 * DELETE /api/settings/webhooks/[id]
 * Delete a Discord webhook.
 * Admin only.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, {}, async ({ supabase, audit }) => {

    const { id } = await params;
    await audit({ action: "delete_webhook", targetType: "webhook", targetId: id }, async () => {
    const { error } = await supabase.from("discord_webhooks").delete().eq("id", id);
    if (error) throw new Error(error.message);

    });
    return successResponse({ deleted: true });
  });
}
