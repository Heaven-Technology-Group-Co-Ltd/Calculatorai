import {
  Activity,
  Database,
  Globe,
  Mail,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { CheckStatus, Range } from "./types";

export const SERVICES = ["supabase", "stripe", "smtp", "nextjs"] as const;
export type ServiceKey = (typeof SERVICES)[number];

export const SERVICE_META: {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  hint: string;
}[] = [
  { id: "supabase", label: "Supabase", icon: Database, color: "#E8B896", hint: "Postgres + Auth" },
  { id: "stripe", label: "Stripe", icon: Shield, color: "#D4A045", hint: "Payments API" },
  { id: "smtp", label: "SMTP", icon: Mail, color: "#7DD3FC", hint: "Email delivery" },
  { id: "nextjs", label: "Next.js", icon: Globe, color: "#86EFAC", hint: "App server" },
];

export const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
];

// These render as status label text (StatusClient.module.css .serviceStatus
// reads --status-color), so the values must be tokens meeting 4.5:1 on card
// surfaces — the raw error red measured 2.9:1 and the old unknown gray 4.31:1.
export const STATUS_COLOR: Record<CheckStatus, string> = {
  ok: "var(--success)",
  degraded: "var(--warning)",
  error: "var(--error)",
  unknown: "var(--status-unknown)",
};

export const STATUS_LABEL: Record<CheckStatus, string> = {
  ok: "Operational",
  degraded: "Degraded",
  error: "Outage",
  unknown: "Unknown",
};
