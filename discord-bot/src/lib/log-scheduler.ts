import cron from "node-cron";
import { EmbedBuilder, type Client } from "discord.js";
import { supabase } from "./supabase";

// ── Config ──────────────────────────────────────────────────────────────────

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[LogScheduler] Missing env ${name}`);
  return v;
}

const cfg = {
  channelId: required("DISCORD_LOG_CHANNEL_ID"),
  alertRoleId: process.env.DISCORD_ALERT_ROLE_ID,
  windowHours: Number(process.env.LOG_WINDOW_HOURS ?? 12),
  checkEveryMin: Number(process.env.HEALTH_CHECK_INTERVAL_MIN ?? 5),
  cron: process.env.LOG_CRON ?? "0 0,12 * * *",
};

const STATE_KEY = "health-report";
const REPORTED = [
  { id: "supabase", label: "Supabase" },
  { id: "stripe", label: "Stripe" },
  { id: "smtp", label: "SMTP" },
  { id: "discord", label: "Discord" },
] as const;

const MIN_COVERAGE = 0.8;
const ERROR_RATIO = 0.05;

// ── Types ───────────────────────────────────────────────────────────────────

interface HealthRow {
  service: string;
  checks: number;
  ok: number;
  degraded: number;
  error: number;
  avg_latency: number;
  p95_latency: number;
}

type Level = "ok" | "degraded" | "gap" | "error";

const RANK: Record<Level, number> = { ok: 0, degraded: 1, gap: 2, error: 3 };
const ICON: Record<Level, string> = { ok: "🟢", degraded: "🟡", gap: "🟠", error: "🔴" };
const COLOR: Record<Level, number> = {
  ok: 0x22c55e,
  degraded: 0xeab308,
  gap: 0xf97316,
  error: 0xef4444,
};

// ── Pure logic ──────────────────────────────────────────────────────────────

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

function levelOf(row: HealthRow | undefined, expected: number): Level {
  if (!row || row.checks / expected < MIN_COVERAGE) return "gap";
  const failed = row.degraded + row.error;
  if (failed / row.checks >= ERROR_RATIO) return "error";
  return failed > 0 ? "degraded" : "ok";
}

export function buildEmbed(rows: HealthRow[], now = new Date()) {
  const expected = (cfg.windowHours * 60) / cfg.checkEveryMin;
  const byService = new Map(rows.map((r) => [r.service, r]));

  let worst: Level = "ok";
  let totalChecks = 0;
  let totalFailed = 0;

  const lines = REPORTED.map(({ id, label }) => {
    const row = byService.get(id);
    const level = levelOf(row, expected);
    if (RANK[level] > RANK[worst]) worst = level;

    if (!row) return `${ICON[level]} **${label}**  no data`;

    totalChecks += row.checks;
    totalFailed += row.degraded + row.error;
    const coverage = pct(row.checks, expected);

    return level === "gap"
      ? `${ICON[level]} **${label}**  no data (coverage ${coverage}%)`
      : `${ICON[level]} **${label}**  ${pct(row.ok, row.checks)}%  |  avg ${row.avg_latency}ms  |  p95 ${row.p95_latency}ms`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`📊 System Health — ${cfg.windowHours}h Report`)
    .setDescription(
      `<t:${Math.floor(now.getTime() / 1000)}:f>\n\n${lines.join("\n")}`,
    )
    .addFields(
      { name: "Checks", value: String(totalChecks), inline: true },
      { name: "Failed checks", value: String(totalFailed), inline: true },
      {
        name: "Coverage",
        value: `${pct(totalChecks, expected * REPORTED.length)}%`,
        inline: true,
      },
    )
    .setColor(COLOR[worst]);

  return { embed, level: worst };
}

function buildUnavailableEmbed(reason: string) {
  return new EmbedBuilder()
    .setTitle("🔴 Health report unavailable")
    .setDescription(
      `ดึงข้อมูลจาก \`health_checks\` ไม่สำเร็จ\n\`\`\`${reason.slice(0, 500)}\`\`\``,
    )
    .setColor(COLOR.error);
}

// ── I/O ─────────────────────────────────────────────────────────────────────

async function queryHealthReport(): Promise<HealthRow[]> {
  const { data, error } = await supabase.rpc("health_report", {
    p_hours: cfg.windowHours,
  });
  if (error) throw error;
  return (data ?? []) as HealthRow[];
}

async function isDue(): Promise<boolean> {
  const { data } = await supabase
    .from("bot_report_state")
    .select("last_run_at")
    .eq("key", STATE_KEY)
    .maybeSingle();
  if (!data) return true;
  const interval = cfg.windowHours * 3_600_000;
  return Date.now() - new Date(data.last_run_at).getTime() >= interval * 0.9;
}

async function markSent(): Promise<void> {
  await supabase
    .from("bot_report_state")
    .upsert({ key: STATE_KEY, last_run_at: new Date().toISOString() });
}

// ── Public API ──────────────────────────────────────────────────────────────

/** ไม่ throw ออกนอกฟังก์ชัน — ปลอดภัยที่จะเรียกจาก cron */
export async function runReport(
  client: Client,
  opts: { force?: boolean } = {},
): Promise<void> {
  try {
    if (!opts.force && !(await isDue())) return;

    const channel = await client.channels.fetch(cfg.channelId);
    if (!channel || !channel.isSendable()) {
      throw new Error(`Channel ${cfg.channelId} not found or not sendable`);
    }

    let payload: { embeds: EmbedBuilder[]; content?: string };
    let level: Level;

    try {
      const built = buildEmbed(await queryHealthReport());
      payload = { embeds: [built.embed] };
      level = built.level;
    } catch (err) {
      console.error("[LogScheduler] query failed:", err);
      payload = {
        embeds: [buildUnavailableEmbed(err instanceof Error ? err.message : String(err))],
      };
      level = "error";
    }

    const ping = cfg.alertRoleId && RANK[level] >= RANK.gap;
    await channel.send({
      ...payload,
      content: ping ? `<@&${cfg.alertRoleId}>` : undefined,
      allowedMentions: { roles: ping ? [cfg.alertRoleId!] : [] },
    });

    await markSent();
  } catch (err) {
    console.error("[LogScheduler] report failed:", err);
  }
}

export function startLogScheduler(client: Client): void {
  cron.schedule(cfg.cron, () => void runReport(client), {
    timezone: "Asia/Bangkok",
  });
  void runReport(client); // catch-up: ส่งเฉพาะถ้าเลยรอบไปแล้ว (isDue)
}
