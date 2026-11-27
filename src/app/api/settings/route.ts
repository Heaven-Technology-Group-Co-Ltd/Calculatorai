import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { UpdateSettingSchema } from "@/lib/admin/schemas";
import { withAuditLog } from "@/lib/admin/audit";
import { setMaintenance, readMaintenanceState } from "@/lib/admin/state";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * GET /api/settings
 * Retrieve all site settings including maintenance mode state.
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

    const { data, error } = await supabase.from("site_settings").select("*");
    if (error && error.code !== "42P01") throw new Error(error.message);

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value ?? "";
    }

    const state = await readMaintenanceState();
    settings["maintenance_mode"] = String(state.maintenanceMode);
    settings["maintenance_message"] = state.maintenanceMessage || "";

    return successResponse(settings);
  } catch (err) {
    console.error("[Settings] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}

/**
 * POST /api/settings
 * Update a site setting by key/value.
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
    const parsed = UpdateSettingSchema.safeParse({ key: body.key, value: body.value, message: body.message });
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const key = parsed.data.key;

    const data = await withAuditLog({ adminUserId: admin.id, action: "update_setting", targetType: "setting", targetId: key, metadata: { value: parsed.data.value } }, async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .upsert({ key, value: parsed.data.value, updated_at: new Date().toISOString(), updated_by: admin.id })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (key === "maintenance_mode") setMaintenance(parsed.data.value === "true", parsed.data.message || "System under maintenance");


      return data;
    });
    return successResponse(data);
  } catch (err) {
    console.error("[Settings] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
