# Discord Log Scheduler — Design (v2)

## 1. Overview

Discord bot ส่งสรุป system health ทุก 12 ชม. ไปยัง channel ที่กำหนด เพื่อดูสถานะได้โดยไม่ต้องเปิด status page

**หลักการสำคัญ:** รายงานต้อง _ไม่โกหก_ — ถ้าไม่มีข้อมูล ต้องบอกว่า "ไม่มีข้อมูล" ไม่ใช่ขึ้น 🟢 100%

---

## 2. Design Decisions

| ปัญหา (v1)                                      | ทางแก้ (v2)                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| ไม่มี check = แสดง 100% uptime                  | คำนวณ **coverage**; ต่ำกว่า 80% → 🟠 `Data gap`         |
| Restart / deploy = ส่งรายงานซ้ำ                 | เก็บ `last_run_at` ใน DB, ส่งเฉพาะเมื่อถึงรอบ           |
| `setInterval` เวลาเพี้ยนตาม uptime              | `node-cron` ล็อกเวลา `00:00 / 12:00` ตาม `Asia/Bangkok` |
| `sendReport()` ไม่มี catch → process ตาย        | ทุก path อยู่ใน try/catch, ไม่ throw ออกนอก scheduler   |
| Query พังแล้วเงียบ                              | ส่ง embed สีแดง "Report unavailable" แทนการข้าม         |
| Aggregate ด้วย SQL ตรงๆ ผ่าน supabase-js ไม่ได้ | ทำเป็น Postgres function (RPC)                          |
| แยก degraded / error ไม่ได้                     | RPC คืนทั้ง 3 สถานะ                                     |
| avg latency ปิดบัง spike                        | แสดง p95 คู่กับ avg                                     |
| Next.js row hardcode `ok / 0ms`                 | ตัดออกจากรายงาน (ไม่มีข้อมูลจริง)                       |
| รายงานแดงแต่ไม่มีใครรู้                         | mention role เมื่อเป็น 🔴 หรือ 🟠                       |

---

## 3. Architecture

```
node-cron (00:00, 12:00 Asia/Bangkok)  +  catch-up ตอน bot ready
        │
        ▼
   isDue()  ── bot_report_state.last_run_at ──► ยังไม่ถึงรอบ → return
        │
        ▼
   rpc health_report(12)  ──► rows[]
        │
        ▼
   buildEmbed(rows, now)   ← pure function, unit test ได้
        │
        ▼
   channel.send(embed [+ role mention]) ──► markSent()
```

### ไฟล์

```
discord-bot/src/lib/log-scheduler.ts   — scheduler + query + embed
discord-bot/src/lib/supabase.ts        — existing client (reuse)
discord-bot/src/index.ts               — เรียก startLogScheduler ตอน ready
supabase/migrations/xxxx_health_report.sql
```

---

## 4. Database Migration

```sql
-- Index รองรับ query ช่วงเวลา
create index if not exists health_checks_created_at_idx
  on health_checks (created_at desc);
create index if not exists health_checks_service_created_idx
  on health_checks (service, created_at desc);

-- State กันส่งซ้ำ
create table if not exists bot_report_state (
  key         text primary key,
  last_run_at timestamptz not null
);

-- Aggregate ฝั่ง DB
create or replace function health_report(p_hours int)
returns table (
  service     text,
  checks      bigint,
  ok          bigint,
  degraded    bigint,
  error       bigint,
  avg_latency int,
  p95_latency int
)
language sql stable as $$
  select
    service,
    count(*),
    count(*) filter (where status = 'ok'),
    count(*) filter (where status = 'degraded'),
    count(*) filter (where status = 'error'),
    round(avg(latency_ms))::int,
    round((percentile_cont(0.95) within group (order by latency_ms))::numeric)::int
  from health_checks
  where created_at >= now() - make_interval(hours => p_hours)
  group by service
$$;

revoke execute on function health_report(int) from anon, authenticated;

-- Retention 60 วัน (ต้องเปิด pg_cron extension)
select cron.schedule(
  'health-checks-retention', '0 3 * * *',
  $$ delete from health_checks where created_at < now() - interval '60 days' $$
);
```

> `GROUP BY` ไม่คืนแถวให้ service ที่ไม่มี check เลย → ฝั่ง TS ต้อง fill เองจากรายการ service (ดูข้อ 6)

---

## 5. Embed Format

```
┌─────────────────────────────────────────────┐
│ 📊 System Health — 12h Report               │
│ <t:unix:f>   (Discord แปลง timezone ให้เอง)  │
├─────────────────────────────────────────────┤
│ 🟢 Supabase   100%  | avg 380ms  | p95 720ms │
│ 🟢 Stripe     100%  | avg 381ms  | p95 640ms │
│ 🟡 SMTP       97.6% | avg 1041ms | p95 2300ms│
│ 🟠 Discord    no data (coverage 32%)        │
│                                             │
│ Checks: 504 | Failed checks: 3 | Coverage 93%│
└─────────────────────────────────────────────┘
```

**ระดับสถานะ (เรียงจากแย่สุด):**

| Level       | เงื่อนไข                       | สี        | Mention role |
| ----------- | ------------------------------ | --------- | ------------ |
| 🔴 error    | failed checks ≥ 5%             | `#ef4444` | ✅           |
| 🟠 gap      | coverage < 80% หรือไม่มีแถวเลย | `#f97316` | ✅           |
| 🟡 degraded | มี failed check บ้าง (< 5%)    | `#eab308` | ❌           |
| 🟢 ok       | ทุก check ผ่าน                 | `#22c55e` | ❌           |

- "Failed checks" = `degraded + error` (ไม่เรียก _incidents_ เพราะไม่ใช่ incident จริง)
- Coverage = `checks จริง ÷ (window_hours × 60 ÷ check_interval_min)`

---

## 6. Implementation

```ts
// discord-bot/src/lib/log-scheduler.ts
import cron from "node-cron";
import { EmbedBuilder, type Client, type SendableChannels } from "discord.js";
import { supabase } from "./supabase";

// ── Config (fail fast) ──────────────────────────────────────────
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
] as const; // nextjs ตัดออก: hardcode ok ไม่มีข้อมูลจริง

const MIN_COVERAGE = 0.8;
const ERROR_RATIO = 0.05;

// ── Types ───────────────────────────────────────────────────────
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
const ICON: Record<Level, string> = {
  ok: "🟢",
  degraded: "🟡",
  gap: "🟠",
  error: "🔴",
};
const COLOR: Record<Level, number> = {
  ok: 0x22c55e,
  degraded: 0xeab308,
  gap: 0xf97316,
  error: 0xef4444,
};

// ── Pure logic (unit-testable) ──────────────────────────────────
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

// ── I/O ─────────────────────────────────────────────────────────
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

async function fetchChannel(client: Client): Promise<SendableChannels> {
  const ch = await client.channels.fetch(cfg.channelId);
  if (!ch || !ch.isSendable())
    throw new Error(`Channel ${cfg.channelId} not found or not sendable`);
  return ch;
}

// ── Public API ──────────────────────────────────────────────────
/** ไม่ throw ออกนอกฟังก์ชัน — ปลอดภัยที่จะเรียกจาก cron / slash command */
export async function runReport(
  client: Client,
  opts: { force?: boolean } = {},
): Promise<void> {
  try {
    if (!opts.force && !(await isDue())) return;

    const channel = await fetchChannel(client);

    let payload: { embeds: EmbedBuilder[]; content?: string };
    let level: Level;
    try {
      const built = buildEmbed(await queryHealthReport());
      payload = { embeds: [built.embed] };
      level = built.level;
    } catch (err) {
      console.error("[LogScheduler] query failed:", err);
      payload = {
        embeds: [
          buildUnavailableEmbed(
            err instanceof Error ? err.message : String(err),
          ),
        ],
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
```

**Integration** — `discord-bot/src/index.ts`:

```ts
import { startLogScheduler } from "./lib/log-scheduler";

client.once("ready", () => startLogScheduler(client));
```

---

## 7. Config

| Env                         | Default        | หมายเหตุ                                            |
| --------------------------- | -------------- | --------------------------------------------------- |
| `DISCORD_LOG_CHANNEL_ID`    | —              | **required** (ไม่มีค่า = bot ไม่ start)             |
| `DISCORD_ALERT_ROLE_ID`     | —              | optional; ไม่ตั้ง = ไม่ mention                     |
| `LOG_WINDOW_HOURS`          | `12`           | ช่วงที่สรุป และเป็นความถี่รายงาน                    |
| `HEALTH_CHECK_INTERVAL_MIN` | `5`            | ความถี่ที่มีคนยิง `/api/status` (ใช้คำนวณ coverage) |
| `LOG_CRON`                  | `0 0,12 * * *` | เปลี่ยนเป็น `* * * * *` ตอน dev ได้                 |

> ต้องตั้ง `HEALTH_CHECK_INTERVAL_MIN` ให้ตรงกับความถี่จริงของ pinger/uptime monitor ที่ยิง `/api/status` ถ้าตั้งผิด coverage จะเพี้ยน

**Permission ที่ bot ต้องมีใน channel:** `ViewChannel`, `SendMessages`, `EmbedLinks` (+ `MentionEveryone` ถ้า role ตั้งเป็น non-mentionable)

---

## 8. Error Handling

| สถานการณ์                 | พฤติกรรม                                                 |
| ------------------------- | -------------------------------------------------------- |
| Env ขาด                   | throw ตอน startup (fail fast)                            |
| RPC query fail            | ส่ง embed 🔴 "Report unavailable"                        |
| Channel ไม่พบ / ส่งไม่ได้ | log error, ไม่ `markSent` → รอบถัดไป / restart จะลองใหม่ |
| Discord API ล่ม           | เหมือนข้างบน                                             |
| ทุก path                  | ไม่ throw ออกนอก `runReport` → ไม่ crash bot             |

---

## 9. Testing

1. **Unit:** `buildEmbed()` เป็น pure function — เทสเคส all-ok / degraded / error / gap / rows ว่าง
2. **Manual:** ตั้ง `LOG_CRON="* * * * *"` แล้วลบ row ใน `bot_report_state` เพื่อ force ส่ง (ไม่ต้องแก้โค้ด)
3. **Restart test:** restart bot 3 ครั้งติด → ต้องได้รายงานไม่เกิน 1 ฉบับ
4. **Gap test:** ปิด pinger ชั่วคราวแล้วรัน → ต้องเห็น 🟠 ไม่ใช่ 🟢

---

## 10. Follow-ups (Phase 2)

- Slash command `/report` → เรียก `runReport(client, { force: true })`
- Alert แบบ state-change (ok → error) แบบ real-time แทนการรอรอบ 12 ชม.
- ให้ bot ยิง probe ไปที่ `/api/status` เอง เพื่อจับ outage ที่ Next.js ตายทั้งตัว (ตอนนี้ข้อมูลมาจากคนที่ยิงเข้ามาเท่านั้น)
- ตรวจว่า Supabase `max rows` (default 1,000) ไม่ตัด `.limit(10_000)` ใน status route เงียบๆ

## 11. Out of Scope

- Log detail ต่อ incident (ใช้ status page)
- ส่งหลาย channel
- เก็บ history ใน Discord (ใช้ `health_checks` เป็น source of truth)
