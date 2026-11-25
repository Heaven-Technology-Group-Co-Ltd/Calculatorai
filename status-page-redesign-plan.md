# แผนออกแบบหน้า System Status ใหม่ (สำหรับแก้โค้ดจริง)

เอกสารนี้คือแผนสำหรับนำไปแก้ Next.js จริง อ้างอิงหน้าตาที่ทำให้ดูใน `status-page.html` (ใช้ดูเป็น reference เท่านั้น ไม่ต้องเอา HTML ไปใช้)

## 0. ขอบเขตงาน

**ไฟล์ที่ต้องแก้**

| ไฟล์ | สิ่งที่ทำ |
|------|-----------|
| `StatusClient.module.css` | แก้ bug `gap`, ขยายหน้า, วางกราฟเต็มแถว |
| `utils.ts` | เปลี่ยนรูปแบบ label แกน X ตามช่วงเวลา |
| `StatusClient.tsx` | ปรับ tooltip header (`fullLabels`) |
| `components/Charts.tsx` | ปรับแกน X, จุดข้อมูล, ช่องว่างของข้อมูล |
| `api/status/route.ts` | await insert, cache Stripe |
| `api/status/history/route.ts` | ย้ายการรวมข้อมูลไปทำใน SQL |
| Supabase + cron | function `health_history`, retention, ตัวยิง `/api/status` ตามเวลา |

**ไฟล์ที่ไม่ต้องแตะ:** `types.ts`, `constants.ts`, `page.tsx`, `ServiceCard.tsx`, `KPIBar.tsx`, `IncidentTimeline.tsx`, `SystemInfo.tsx`

**ไม่เปลี่ยน:** สี, ฟอนต์, design tokens จาก `globals.css`, โครงหน้าโดยรวม (banner, KPI, services, incidents, system info)

---

## 1. สิ่งที่เปลี่ยนจากเดิม

| หัวข้อ | เดิม | ใหม่ | เหตุผล |
|--------|------|------|--------|
| ความกว้างหน้า | max 1120px | max 1440px | ให้ label รายชั่วโมง / รายวันวางเรียงแบนได้ครบ |
| กราฟ | 2 คอลัมน์ | 1 คอลัมน์ ต่อ 1 แถว | กราฟกว้างขึ้นเท่านั้นถึงแสดง label ครบ |
| label 24H | ทุก ~4 ชม. | ทุกชั่วโมง `00:00 01:00 …` | ดูรายชั่วโมงได้ตรง ๆ |
| label 7D | `Sep 24` | `Wed 24` และมีจุดบนเส้น | มีแค่ 7 จุด เห็นวันในสัปดาห์ชัดกว่า |
| label 30D | บางวัน | ทุกวัน `Sep 1 … Sep 30` | ตามตัวอย่างที่ต้องการ |
| ช่วงไม่มีข้อมูล | เส้นต่อข้ามช่องว่าง | เป็นช่องว่างจริง | ไม่โกหกว่ามีข้อมูลตรงนั้น |
| Tooltip 7D/30D | วันที่ + เวลา | วัน + วันที่เต็ม | bucket เป็นรายวัน เวลาไม่มีความหมาย |
| subtitle icon | `gap: 6` (ไม่มีหน่วย ไม่ทำงาน) | `gap: 6px` | bug |

---

## 2. Layout

```
┌───────────────────────────────────────────────────────────┐
│ System Status                       [24H][7D][30D] Refresh│
│ Updated 14:02 · auto-refresh 1h                           │
├───────────────────────────────────────────────────────────┤
│ ● All Systems Operational                     99.8%       │  banner
├───────────────────────────────────────────────────────────┤
│ Uptime │ Avg latency │ Checks │ Incidents                 │  KPI x4
├───────────────────────────────────────────────────────────┤
│ Supabase │ Stripe │ SMTP │ Discord │ Next.js              │  services x5
├───────────────────────────────────────────────────────────┤
│ Uptime %  (เต็มความกว้าง)                                  │
│  00:00 01:00 02:00 … 23:00                                │
├───────────────────────────────────────────────────────────┤
│ Response time  (เต็มความกว้าง)                             │
│  00:00 01:00 02:00 … 23:00                                │
├─────────────────────────────────┬─────────────────────────┤
│ Incident timeline               │ System info             │
└─────────────────────────────────┴─────────────────────────┘
```

Responsive: ต่ำกว่า 1024px services เหลือ 3 คอลัมน์, KPI 2 คอลัมน์; ต่ำกว่า 900px ส่วนล่างเรียงเป็นคอลัมน์เดียว (ของเดิม ไม่ต้องแก้)

---

## 3. ข้อกำหนดกราฟต่อช่วงเวลา

| Range | Bucket | Label แกน X | จุดบนเส้น | Tooltip header |
|-------|--------|-------------|-----------|----------------|
| 24H | 1 ชั่วโมง (24 จุด) | `15:00` | ไม่มี | วันที่ + เวลาเต็ม |
| 7D | 1 วัน (7 จุด) | `Wed 24` | มี | `Wed, Sep 24, 2026` |
| 30D | 1 วัน (30 จุด) | `Sep 24` | ไม่มี | `Wed, Sep 24, 2026` |

กติการ่วม
- จอกว้าง แสดง label ครบทุก bucket แบนราบ ไม่เอียง
- จอแคบ ให้ Recharts ซ่อน label ที่ชนกันเอง (`interval="preserveStartEnd"` + `minTickGap` ต่ำ) ห้ามใช้ `interval={0}`
- bucket ที่ไม่มีการตรวจสอบเลย = `null` แสดงเป็นช่องว่าง ห้ามใส่ `connectNulls`
- Uptime chart โดเมนแกน Y คงตรรกะเดิม (`uptimeDomain`)

---

## 4. งานแยกตามไฟล์

### 4.1 `StatusClient.module.css`

```css
.container { max-width: 1440px; }              /* เดิม 1120px */
.charts    { grid-template-columns: 1fr; }     /* เดิม 1fr 1fr */
.subtitle  { gap: 6px; }                       /* เดิม gap: 6; */
```

### 4.2 `utils.ts`

```ts
export function formatBucketLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "24h") return `${String(d.getHours()).padStart(2, "0")}:00`;
  if (range === "7d")
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

### 4.3 `StatusClient.tsx` (memo `fullLabels`)

```tsx
const fullLabels = useMemo(() => {
  const map = new Map<string, string>();
  for (const pt of history?.series ?? []) {
    const d = new Date(pt.start);
    map.set(
      formatBucketLabel(pt.start, range),
      range === "24h"
        ? d.toLocaleString()
        : d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
    );
  }
  return map;
}, [history, range]);
```

### 4.4 `components/Charts.tsx`

XAxis ของทั้งสองกราฟ

```tsx
<XAxis
  dataKey="label"
  tick={{ fontSize: 11, fill: "#B8B0A8" }}
  axisLine={{ stroke: "rgba(232,184,150,0.08)" }}
  tickLine={{ stroke: "rgba(232,184,150,0.25)" }}
  interval="preserveStartEnd"
  minTickGap={6}          // เดิม 32
/>
```

`Line` ของ latency chart

```tsx
<Line
  key={m.id}
  type="monotone"
  dataKey={m.id}
  name={m.id}
  stroke={m.color}
  strokeWidth={2}
  dot={chartPoints.length <= 8}   // จุดเฉพาะ 7D
  // ลบ connectNulls ออก
/>
```

Subtitle ของ Uptime chart

```tsx
{range === "24h" ? "One bucket per hour, local time" : "Daily buckets"} · {range} window
```

### 4.5 `api/status/route.ts`

**await การบันทึก** (serverless อาจฆ่างานที่ไม่ได้ await หลังตอบ response)

```ts
const { error: persistErr } = await db.from("health_checks").insert(
  (Object.entries(checks) as [Service, ServiceCheck][]).map(([service, c]) => ({
    service,
    status: c.status,
    latency_ms: c.latencyMs,
    details: c.message ? { message: c.message } : {},
  })),
);
if (persistErr) console.error("[Status] Persist failed:", persistErr);
```

ถ้าใช้ Next.js 15+ จะใช้ `after()` จาก `next/server` แทนเพื่อไม่ให้ response ช้าลงก็ได้

**cache Stripe 60 วินาที** (แบบเดียวกับ SMTP)

```ts
let stripeCache: { result: ServiceCheck; at: number } | null = null;
const STRIPE_TTL = 60_000;

async function checkStripe(): Promise<ServiceCheck> {
  if (stripeCache && Date.now() - stripeCache.at < STRIPE_TTL) return stripeCache.result;
  const start = Date.now();
  let result: ServiceCheck;
  try {
    const { stripe } = await import("@/lib/stripe");
    await withTimeout(stripe.balance.retrieve(), 3_000, "Stripe timeout");
    result = { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    result = fail(start, err);
  }
  stripeCache = { result, at: Date.now() };
  return result;
}
```

หมายเหตุ: cache ใน module อยู่ได้เท่าที่ instance ยังอุ่นอยู่ ช่วยลดการเรียก แต่ไม่การันตีว่าทุก 1 นาทีเรียกครั้งเดียว

### 4.6 Supabase (ทำก่อนเปิด cron)

ปัญหา: ทั้งสอง route ใช้ `.limit(10_000)` และ history เรียง `ascending` ก่อน limit ทำให้ช่วง 30D ได้แถวเก่าสุด 10,000 แถว แล้วตัดข้อมูลล่าสุดทิ้งเงียบ ๆ

| ความถี่ cron | แถวต่อวัน (5 services) | แถวใน 30 วัน |
|--------------|------------------------|--------------|
| ทุก 15 นาที | 480 | 14,400 (เกิน) |
| ทุก 5 นาที | 1,440 | 43,200 (เกิน) |

แก้โดยรวมข้อมูลใน Postgres

```sql
create or replace function health_history(
  p_since timestamptz, p_bucket text, p_service text default null
) returns table (bucket timestamptz, service text, checks int, ok int, avg_latency int)
language sql stable as $$
  select date_trunc(p_bucket, created_at), service,
         count(*)::int,
         (count(*) filter (where status = 'ok'))::int,
         coalesce(round(avg(latency_ms)), 0)::int
  from health_checks
  where created_at >= p_since and (p_service is null or service = p_service)
  group by 1, 2
  order by 1;
$$;
```

ฝั่ง route เรียก `db.rpc("health_history", { p_since, p_bucket: "hour" | "day", p_service })` แล้ว map แต่ละแถวเป็น

```ts
{ checks, uptimePct: round1((ok / checks) * 100), avgLatencyMs: avg_latency, incidents: checks - ok }
```

`buildStats` (ตัวเลข 24h/7d/30d รวม) ให้ใช้วิธีเดียวกัน

ข้อควรระวัง: `date_trunc` ตัดตามเขตเวลาของ database (ปกติ UTC) ถ้าต้องการวันตามเวลาไทย ให้ใช้ `date_trunc(p_bucket, created_at at time zone 'Asia/Bangkok')`

Retention (รันวันละครั้งด้วย pg_cron)

```sql
delete from health_checks where created_at < now() - interval '35 days';
```

### 4.7 ตัวยิงตามเวลา (cron)

ตอนนี้ข้อมูลถูกบันทึกเฉพาะตอนมีคนเปิดหน้า เลยเกิดช่องว่างเวลาไม่มีคนเข้า

- ถ้าโฮสต์บน Vercel: `vercel.json`
  ```json
  { "crons": [{ "path": "/api/status", "schedule": "*/15 * * * *" }] }
  ```
  แผน Hobby รันได้แค่วันละครั้ง ถ้าเป็น Hobby ให้ใช้ตัวยิงภายนอก (UptimeRobot, cron-job.org) แทน
- endpoint นี้ตอบ HTTP 503 เมื่อบริการใดเสีย ตัวยิงภายนอกจะมองเป็น "down" ซึ่งใช้ได้ แต่อย่าสับสนกับเว็บล่มจริง

---

## 5. ลำดับการทำ

1. **เฟส 1: frontend อย่างเดียว (ปลอดภัย)** ข้อ 4.1 ถึง 4.4 ดูผลได้ทันที ไม่กระทบข้อมูล
2. **เฟส 2: ความน่าเชื่อถือของ API** ข้อ 4.5 (await insert, cache Stripe)
3. **เฟส 3: ข้อมูลย้อนหลัง** ข้อ 4.6 (SQL + ปรับ route) แล้วค่อยเปิด 4.7 (cron) **ห้ามเปิด cron ก่อนทำ 4.6**

ตัวเลือกเสริม: ลดรอบ auto-refresh ใน `StatusClient.tsx` จาก `3_600_000` (1 ชม.) เป็น 60 ถึง 300 วินาที หลังมี cron แล้ว

---

## 6. เช็คลิสต์ตรวจรับ

**หน้าตา**
- [ ] 24H: เห็น `00:00` ถึง `23:00` ครบทุกชั่วโมงบนจอกว้าง ไม่เอียง ไม่ทับกัน
- [ ] 7D: เห็นครบ 7 วัน (`Wed 24` …) และมีจุดบนเส้น
- [ ] 30D: เห็นวันที่ครบบนจอกว้าง จอแคบข้ามบางวันโดยไม่ทับกัน
- [ ] ย่อ/ขยายหน้าต่าง กราฟวาดใหม่ ไม่ล้นออกนอก panel
- [ ] subtitle มีระยะห่างระหว่างไอคอนกับข้อความ
- [ ] bucket ที่ไม่มีข้อมูลเป็นช่องว่างในเส้น และ tooltip ไม่แสดงค่าปลอม

**พฤติกรรม**
- [ ] Tooltip 24H แสดงวันที่และเวลา ส่วน 7D/30D แสดงวันที่พร้อมวันในสัปดาห์
- [ ] สลับ 24H / 7D / 30D แล้ว label เปลี่ยนตามตารางข้อ 3

**Backend**
- [ ] เปิดหน้า `/status` แล้วมีแถวใหม่ใน `health_checks` ครบ 5 แถว (เช็คหลัง deploy ว่าไม่โดนฆ่าก่อนบันทึก)
- [ ] รีเฟรชหลายครั้งใน 1 นาที Stripe ถูกเรียกไม่เกิน 1 ครั้ง (ดู log)
- [ ] `/api/status/history?range=30d` ได้ข้อมูลถึงวันนี้ ไม่ตัดช่วงล่าสุด (ทดสอบหลังมีข้อมูลเกิน 10,000 แถว)
- [ ] cron ยิงตามรอบ และแถวใหม่เข้าตามเวลา

**ทดสอบสถานะเสีย (ทำชั่วคราวใน dev)**
- [ ] ลบ `SMTP_HOST` ชั่วคราว: SMTP ขึ้น Outage, banner เป็น Partial Outage, มี ONGOING ใน timeline
- [ ] ปรับ `last_seen` ใน `bot_heartbeats` ให้เก่ากว่า 2 ชม.: Discord ขึ้น Degraded

---

## 7. นอกขอบเขต (ยังไม่ต้องทำ)

- 7D แบบรายชั่วโมง (168 bucket) ทำได้โดยเปลี่ยน `RANGES["7d"]` ใน history route เป็น `bucketMs: 3_600_000, bucket: "hour"` แต่ให้ทำหลังข้อ 4.6 เสร็จเท่านั้น เพราะข้อมูลเพิ่มขึ้นมาก
- เปลี่ยนสี, ฟอนต์, หรือโครง component
