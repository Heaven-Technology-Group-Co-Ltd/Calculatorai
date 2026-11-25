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
