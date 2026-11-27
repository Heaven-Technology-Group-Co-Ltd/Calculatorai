export const ADMIN_CONTROL_ACTIONS = ["get_stats", "toggle_maintenance", "broadcast"] as const;
export type AdminControlAction = (typeof ADMIN_CONTROL_ACTIONS)[number];
export type AdminControlRequest =
  | { action: "get_stats"; scope: "users" | "system" | "all" }
  | { action: "toggle_maintenance"; enabled: boolean; message?: string }
  | { action: "broadcast"; content: string; target: "all" | "web" | "discord" };
export interface AdminControlResponses {
  get_stats: { system?: { maintenanceMode: boolean; maintenanceMessage: string | null; uptimeSince: string; lastCommand: string | null; lastCommandBy: string | null; lastCommandAt: string | null; nodeVersion: string; platform: string }; users?: { total: number; last24h: number } };
  toggle_maintenance: { maintenanceMode: boolean; message: string | null; changedBy: string; changedAt: string | null };
  broadcast: { broadcast: boolean; content: string; target: string; sentAt: string };
}

export function buildAdminCanonicalPayload(timestamp: string, callerId: string, rawBody: string, callerTag = ""): string {
  return JSON.stringify([timestamp, callerId, callerTag, rawBody]);
}
