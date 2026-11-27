import { withAdmin } from "@/lib/admin/with-admin";
import { NextRequest, NextResponse } from "next/server";
import { UpdateSettingSchema } from "@/lib/admin/schemas";
import { setMaintenance, readMaintenanceState } from "@/lib/admin/state";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * GET /api/settings
 * Retrieve all site settings including maintenance mode state.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, {}, async ({ supabase }) => {

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
  });
}

/**
 * POST /api/settings
 * Update a site setting by key/value.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  return withAdmin(request, {}, async ({ supabase, admin, audit }) => {

    const body = await request.json();
    const parsed = UpdateSettingSchema.safeParse({ key: body.key, value: body.value, message: body.message });
    if (!parsed.success) return NextResponse.json({ success: false, error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` }, { status: 422 });

    const key = parsed.data.key;

    const data = await audit({ action: "update_setting", targetType: "setting", targetId: key, metadata: { value: parsed.data.value } }, async () => {
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
  });
}
