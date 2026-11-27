import { withAdmin } from "@/lib/admin/with-admin";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedWebhookUrl } from "@/lib/admin/schemas";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * POST /api/settings/webhooks/[id]/test
 * Send a test ping to a Discord webhook.
 * Admin only.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(request, {}, async ({ supabase, audit }) => {

    const { id } = await params;
    const { data: webhook, error } = await supabase.from("discord_webhooks").select("url, name").eq("id", id).single();
    if (error || !webhook) return notFoundResponse("Webhook not found");

    // Defense-in-depth: rows created before the schema allowlist may hold
    // arbitrary URLs — never fetch one.
    if (!isAllowedWebhookUrl(webhook.url)) {
      return badRequestResponse("Webhook URL is not an allowed target");
    }

    await audit({ action: "test_webhook", targetType: "webhook", targetId: id }, async () => {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Test Bot", content: `🔔 Test ping from dashboard for webhook: ${webhook.name}` }),
      });
      if (!response.ok) throw new Error(`Discord responded ${response.status}`);
    });
    return successResponse({ tested: true });
  });
}
