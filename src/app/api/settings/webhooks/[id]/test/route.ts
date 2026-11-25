import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { isAllowedWebhookUrl } from "@/lib/admin/schemas";
import { writeAuditLog } from "@/lib/admin/audit";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * POST /api/settings/webhooks/[id]/test
 * Send a test ping to a Discord webhook.
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
    const { data: webhook, error } = await supabase.from("discord_webhooks").select("url, name").eq("id", id).single();
    if (error || !webhook) return notFoundResponse("Webhook not found");

    // Defense-in-depth: rows created before the schema allowlist may hold
    // arbitrary URLs — never fetch one.
    if (!isAllowedWebhookUrl(webhook.url)) {
      return badRequestResponse("Webhook URL is not an allowed target");
    }

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Test Bot", content: `🔔 Test ping from dashboard for webhook: ${webhook.name}` }),
    });

    if (!res.ok) throw new Error(`Discord responded ${res.status}`);

    void writeAuditLog({ adminUserId: admin.id, action: "test_webhook", targetType: "webhook", targetId: id });
    return successResponse({ tested: true });
  } catch (err) {
    console.error("[Webhook Test] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
