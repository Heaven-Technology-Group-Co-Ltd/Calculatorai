import { withAdmin } from "@/lib/admin/with-admin";
import { NextRequest, NextResponse } from "next/server";
import { CreateWebhookSchema } from "@/lib/admin/schemas";
import { maskWebhook, distinctWebhooks } from "@/lib/admin/webhooks";
import { successResponse } from "@/lib/api-response";

/**
 * GET /api/settings/webhooks
 * List all Discord webhooks, newest first.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const { data, error } = await supabase.from("discord_webhooks").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return successResponse(distinctWebhooks(data ?? []));
  });
}

/**
 * POST /api/settings/webhooks
 * Create a new Discord webhook.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  return withAdmin(request, async ({ supabase, audit }) => {

    const body = await request.json();
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const { data: existing, error: lookupError } = await supabase.from("discord_webhooks").select("id").eq("url", parsed.data.url).limit(1);
    if (lookupError) throw new Error(lookupError.message);
    if (existing?.length) return NextResponse.json({ success: false, error: "Webhook already exists" }, { status: 409 });

    const data = await audit({ action: "create_webhook", targetType: "webhook" }, async () => {
    const { data, error } = await supabase.from("discord_webhooks").insert({ name: parsed.data.name, url: parsed.data.url, event_type: parsed.data.event_type, status: "active" }).select().single();
    if (error) throw new Error(error.message);

      return data;
    });
    return successResponse(maskWebhook(data));
  });
}
