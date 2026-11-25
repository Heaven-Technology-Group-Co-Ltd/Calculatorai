import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { CreateWebhookSchema, UpdateWebhookSchema } from "@/lib/admin/schemas";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * GET /api/settings/webhooks
 * List all Discord webhooks, newest first.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const { data, error } = await supabase.from("discord_webhooks").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return successResponse(data ?? []);
  } catch (err) {
    console.error("[Webhooks] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}

/**
 * POST /api/settings/webhooks
 * Create a new Discord webhook.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const body = await request.json();
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const { data, error } = await supabase.from("discord_webhooks").insert({ name: parsed.data.name, url: parsed.data.url, event_type: parsed.data.event_type, status: "active" }).select().single();
    if (error) throw new Error(error.message);

    void writeAuditLog({ adminUserId: admin.id, action: "create_webhook", targetType: "webhook", targetId: String(data.id) });
    return successResponse(data);
  } catch (err) {
    console.error("[Webhooks] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
