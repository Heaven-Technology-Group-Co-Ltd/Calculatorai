export type CheckStatus = "ok" | "error" | "degraded" | "unknown";
export type Range = "24h" | "7d" | "30d";

export interface ServiceCheck {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
}

export interface ServiceRangeStats {
  // null = no samples in range (health_checks only written on poll), not 100% uptime
  uptimePct: number | null;
  avgLatencyMs: number;
  checks: number;
  incidents: number;
}

export interface RangeStats extends ServiceRangeStats {
  services: Record<string, ServiceRangeStats>;
}

export interface StatusData {
  status: "operational" | "degraded";
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  uptimeSeconds: number;
  checks: Record<string, ServiceCheck>;
  stats: Record<Range, RangeStats>;
  totalLatencyMs: number;
  timestamp: string;
}

export interface BucketStats {
  checks: number;
  uptimePct: number | null;
  avgLatencyMs: number;
  incidents: number;
}

export interface HistoryData {
  service: string;
  range: Range;
  bucket: "hour" | "day";
  series: { start: string; services: Record<string, BucketStats | null> }[];
  summary: Record<string, BucketStats>;
}

export interface Incident {
  id: string;
  time: string;
  service: string;
  message: string;
  kind: "error" | "degraded";
}
