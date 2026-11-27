import { getSupabaseAdmin } from "../supabase-client";

/**
 * Runtime State Store
 *
 * In production, replace this with a Redis/Supabase/database call.
 * Kept in-process here for simplicity — state resets on deploy.
 *
 * For multi-instance deployments, swap for:
 *   - Redis (SET/GET with TTL)
 * - Supabase `admin_state` table
 *   - Vercel KV / Upstash
 */

export interface SystemState {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  lastCommand: string | null;
  lastCommandBy: string | null;
  lastCommandAt: string | null;
  uptimeStart: string;
}

const state: SystemState = {
  maintenanceMode: false,
  maintenanceMessage: null,
  lastCommand: null,
  lastCommandBy: null,
  lastCommandAt: null,
  uptimeStart: new Date().toISOString(),
};

export function getState(): Readonly<SystemState> {
  return { ...state };
}

export function setMaintenance(enabled: boolean, message?: string | null): Readonly<SystemState> {
  state.maintenanceMode = enabled;
  state.maintenanceMessage = message ?? null;
  state.lastCommand = enabled ? "maintenance_on" : "maintenance_off";
  state.lastCommandAt = new Date().toISOString();
  return { ...state };
}

export function recordCommand(action: string, by: string): void {
  state.lastCommand = action;
  state.lastCommandBy = by;
  state.lastCommandAt = new Date().toISOString();
}

let maintenanceCheckedAt = 0;

export async function readMaintenanceState(): Promise<Readonly<SystemState>> {
  if (Date.now() - maintenanceCheckedAt < 15_000) return getState();
  try {
    const { data: setting, error } = await getSupabaseAdmin().from("site_settings")
      .select("value").eq("key", "maintenance_mode").maybeSingle();
    if (error) throw error;
    state.maintenanceMode = setting?.value === "true";
    maintenanceCheckedAt = Date.now();
  } catch (error) {
    console.error("[Maintenance] Settings read failed:", error);
  }
  return getState();
}

export async function persistMaintenance(enabled: boolean, message?: string | null): Promise<Readonly<SystemState>> {
  const { error } = await getSupabaseAdmin().from("site_settings").upsert({
    key: "maintenance_mode", value: String(enabled), updated_at: new Date().toISOString(), updated_by: "system",
  });
  if (error) throw error;
  maintenanceCheckedAt = Date.now();
  return setMaintenance(enabled, message);
}
