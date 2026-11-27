import { formatBucketLabel } from "@/app/status/utils";

export const SERVICES = ["supabase", "stripe", "smtp", "nextjs"] as const;
export type ServiceKey = (typeof SERVICES)[number];
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

export type StatusRange = Range;
export type StatusResponse = StatusData;
export type StatusHistoryResponse = HistoryData;

type ChartPoint = Record<string, string | number | null>;

function historyPoint(start: string, services: Record<string, BucketStats | null>, range: Range): ChartPoint {
  const samples = SERVICES.map((service) => services[service]).filter(
    (sample): sample is BucketStats & { uptimePct: number } => sample != null && sample.uptimePct !== null,
  );
  const uptime = samples.length ? Math.round(samples.reduce((sum, sample) => sum + sample.uptimePct, 0) / samples.length * 10) / 10 : null;
  const point: ChartPoint = { key: start, label: formatBucketLabel(start, range), uptime };
  for (const service of SERVICES) point[service] = services[service]?.avgLatencyMs ?? null;
  return point;
}

function liveIncidents(status: StatusData | undefined): Incident[] {
  if (!status) return [];
  return SERVICES.flatMap((service) => {
    const check = status.checks[service];
    if (!check || check.status === "ok") return [];
    const message = check.message ?? (check.status === "error" ? "Check failing" : check.status === "unknown" ? "Status unknown" : "Running degraded");
    return [{ id: `live-${service}`, time: status.timestamp, service, message, kind: check.status === "error" ? "error" as const : "degraded" as const }];
  });
}

function bucketIncidents(start: string, services: Record<string, BucketStats | null>): Incident[] {
  return SERVICES.flatMap((service) => {
    const stats = services[service];
    if (!stats || stats.incidents <= 0 || stats.uptimePct === null) return [];
    const message = `${stats.incidents} failed check${stats.incidents > 1 ? "s" : ""} · ${stats.uptimePct}% uptime · avg ${stats.avgLatencyMs}ms`;
    return [{ id: `${start}-${service}`, time: start, service, message, kind: stats.uptimePct < 50 ? "error" as const : "degraded" as const }];
  });
}

function getLiveUptime(status: StatusData | undefined, service: ServiceKey, range: Range): number | null {
  return status?.stats[range]?.services[service]?.uptimePct ?? null;
}

function summarizeService(service: ServiceKey, status: StatusData | undefined, history: HistoryData | undefined, range: Range) {
  const historyStats = history?.summary[service];
  return { service, check: status?.checks[service], uptimePct: historyStats?.uptimePct ?? getLiveUptime(status, service, range) };
}

function deriveBanner(status: StatusData | undefined, failing: ServiceKey[]): "maintenance" | "operational" | "outage" | "degraded" {
  if (status?.maintenanceMode) return "maintenance";
  if (failing.length === 0) return "operational";
  return failing.some((service) => status?.checks[service]?.status === "error") ? "outage" : "degraded";
}

export function deriveStatusModel(status: StatusData | undefined, history: HistoryData | undefined, range: Range) {
  const chartPoints: ChartPoint[] = [];
  const fullLabels = new Map<string, string>();
  const incidents = liveIncidents(status);
  const serviceSummaries = SERVICES.map((service) => summarizeService(service, status, history, range));
  const failing = serviceSummaries.filter(({ check }) => check?.status !== "ok").map(({ service }) => service);
  for (const bucket of history?.series ?? []) {
    const point = historyPoint(bucket.start, bucket.services, range);
    chartPoints.push(point);
    const date = new Date(bucket.start);
    fullLabels.set(String(point.label), range === "24h" ? date.toLocaleString() : date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }));
    incidents.push(...bucketIncidents(bucket.start, bucket.services));
  }
  incidents.sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
  const values = chartPoints.map((point) => point.uptime).filter((value): value is number => typeof value === "number");
  return { chartPoints, fullLabels, incidents: incidents.slice(0, 20), serviceSummaries, failing, healthyCount: SERVICES.length - failing.length, banner: deriveBanner(status, failing), hasUptime: values.length > 0, hasLatency: chartPoints.some((point) => SERVICES.some((service) => point[service] !== null)), uptimeDomain: [values.length ? Math.max(0, Math.floor(Math.min(...values) - 5)) : 90, 100] as [number, number] };
}
