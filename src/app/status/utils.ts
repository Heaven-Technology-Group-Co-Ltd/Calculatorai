import type { Range } from "./types";

export function formatUptime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${totalSeconds % 60}s`;
  return `${totalSeconds}s`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function formatBucketLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "24h") return `${String(d.getHours()).padStart(2, "0")}:00`;
  if (range === "7d") return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
