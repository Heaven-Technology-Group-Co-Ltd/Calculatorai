# REFACTOR-PLAN v2.0 — Premium Math Calculator

> แผนปรับปรุง + optimize + code clean ทั้ง codebase (Code / UI / API / DB / Infra)
> **เป้าความสามารถใหม่: รองรับ 10,000 TPS แบบ sustained** (โค้ดเดิมรองรับได้จริงไม่เกิน ~500–800 TPS)
> สร้าง: 2026-10-01 · ทีม: Heaven Developer Team
> **สถานะ: แผนเท่านั้น — ยังไม่ได้ลงมือแก้โค้ดใด ๆ**

---

## 0. สมมติฐานของเป้า 10,000 TPS (อ่านก่อนทุกอย่าง)

**นิยาม:** 10,000 requests/second แบบ sustained ≥ 10 นาที ผ่านช่องทาง API ทั้งหมด (ไม่ใช่ 10,000 concurrent users — ถ้า user หมายถึงอย่างนั้น ให้แจ้งแล้วปรับตัวเลขใหม่ เพราะเบากว่านี้มาก)

**แบ่งความจริงให้ชัด (senior honesty):**
- 10,000 TPS = **864 ล้าน requests/วัน** — โปรเจกต์คำนวณเลขที่มี dashboard admin + Stripe ยังไม่น่ามี traffic ระดับนี้ในโลกจริง แต่แผนนี้ออกแบบให้ "รับได้จริง" ไม่ใช่ตัวเลขลอย
- การคำนวณสูตรทั้ง 45 สูตรเป็น **client-side pure function** — ไม่กิน TPS ของ server แม้แต่ 1 request เป้าหมายจึงอยู่ที่ API layer ล้วน ๆ
- ข้อจำกัดที่แท้จริงคือ **Supabase Postgres เดียว** — ยอดที่รับได้สบายคือ ~1,000–1,500 queries/sec ดังนั้นหัวใจของ 10K TPS คือ **อย่าให้ Postgres เห็น request ตรง ๆ เกิน 1.5K q/s** ด้วยชั้น cache 3 ชั้น + write buffering
- **สูตรความจุ:** `10,000 TPS = Edge cache ~7,000 + buffered writes ~1,500 + replica reads ~1,000 + direct DB ~500`

### 0.1 Traffic Model ที่ใช้ออกแบบ

| ชั้น | สัดส่วน | ~TPS | ทางรอด |
|---|---|---|---|
| Public GET ที่ cache ได้ (status, status/history, settings สาธารณะ, formulas meta) | 70% | 7,000 | **L1 Edge/CDN cache** — ไม่แตะ app เลย |
| Analytics ingest (page-views, events) | 15% | 1,500 | **Fire-and-forget buffer + batch insert** — ไม่รอ DB |
| Authenticated reads (dashboard, users, analytics aggregates) | 10% | 1,000 | **L2 micro-cache + L4 read replica** |
| Auth writes (login, register, verify, reset) | 3% | 300 | Postgres ตรง (low-volume path) + queue email |
| Payments (checkout, webhook) | 2% | 200 | Postgres ตรง — ห้าม async ความถูกต้องสำคัญกว่าความเร็ว |

### 0.2 Bypass ที่โค้ดปัจจุบันพังก่อนถึง 1,000 TPS (ยืนยันจากการอ่านโค้ดแล้ว)

| # | หลักฐานจากโค้ด | ทำไมถึงสะดุด |
|---|---|---|
| 1 | [rate-limiter.ts:70-115](src/lib/rate-limiter.ts) ใช้ 3 Postgres round-trips ต่อ request (read → check → update) | 10K TPS = 30K q/s แรงเข้า DB แค่ rate limit เฉย ๆ → Postgres ตายก่อนอะไรอื่น + มี race condition อีก |
| 2 | [register/route.ts](src/app/api/auth/register/route.ts) ส่ง email **inline** ผ่าน SMTP | SMTP ใช้เวลา 1–5s/ฉบับ — 300 TPS ของ register คือ 300 threads ค้างพร้อมกัน |
| 3 | [page-views/route.ts](src/app/api/page-views/route.ts) insert ต่อ request 1 row | 1,500 TPS = 1,500 single-row INSERTs/sec — write amplification สูงโดยไม่จำเป็น |
| 4 | [users/route.ts](src/app/api/users/route.ts) ใช้ `count: "exact"` + `ilike '%search%'` | count exact = scan ทั้งตารางทุกหน้า, ilike กลาง string ไม่ใช้ index ได้ (จนกว่าจะมี pg_trgm) |
| 5 | [status/route.ts](src/app/api/status/route.ts) ทำ live health checks ทุก request (cache แค่ 60s) | ต่ำกว่า 60s ก็ยังเป็น single point ที่ fan-out เรียก Supabase/Stripe/SMTP/Discord พร้อมกัน |
| 6 | Analytics routes (formulas/funnel/sessions/traffic) aggregate สดจากตาราง events ทุกครั้ง | ตาราง analytics_events โตเป็นพันล้าน rows แล้ว aggregate สด = full scan ต่อ dashboard refresh |
| 7 | ไม่มี connection pooling config ใด ๆ | Serverless เปิด connection ใหม่ต่อ invocation → ชน max_connections ของ Postgres เร็วมาก |

---

## 1. สิ่งที่ห้ามแตะ / Frozen (Non-negotiable — เหมือนเดิม)

| ห้ามแตะ | ไฟล์/ขอบเขต |
|---|---|
| ธีมสี Design System v3 "Ursa" | [globals.css](src/app/globals.css), [design-tokens.ts](src/lib/design-tokens.ts), ทุก `*.module.css` (แก้ได้เฉพาะโครงสร้าง ห้ามแก้ค่าสี/token) |
| ชื่อ / แบรนด์ | ชื่อระบบ, "Heaven Developer Team", ชื่อผลิตภัณฑ์, ชื่อบอท |
| API contract | `{success, data/error}` + status codes เดิม ([api-response.ts](src/lib/api-response.ts)) — cache headers เพิ่มได้ แต่ body ห้ามเปลี่ยน |
| พฤติกรรม UI | ทุกหน้าทำงานเหมือนเดิม |
| ผลลัพธ์ 45 สูตร | ต้องตรงเป๊ะ (test ประกันใน Phase 2) |
| Migration 001–008 | ห้ามแก้ย้อนหลัง — เพิ่มใหม่ได้อย่างเดียว |
| ความถูกต้องเชิงเงิน (Stripe webhook, invoices) | ห้ามยอมแลกความถูกต้องเพื่อ throughput |

## 1.1 สิ่งที่อนุญาต

- เพิ่ม migration ใหม่ต่อจาก 008
- เพิ่ม infra dependency: **Upstash Redis (หรือ Vercel KV)**, **Supabase read replica**, **pg_cron** — ประกาศต้นทุนใน §9
- ย้าย/แยก/รวมไฟล์, เปลี่ยน internal structure, ลบ dead code

---

## 2. สถาปัตยกรรมเป้าหมาย 10,000 TPS

```
                    ┌────────────────────────────────────────────┐
                    │  CDN/Edge (Vercel Edge Network)             │
                    │  L1: s-maxage + stale-while-revalidate      │
                    │  ~7,000 TPS ไม่เคยถึง origin                │
                    └──────────────┬─────────────────────────────┘
                                   ▼
                    ┌────────────────────────────────────────────┐
                    │  Next.js (Fluid Compute / Node cluster)     │
                    │  L2: in-process micro-cache (SWR 5–15s)     │
                    │  Route factory: gate→zod→audit เดิม          │
                    │  Fire-and-forget buffer สำหรับ analytics     │
                    └───────┬──────────────────┬─────────────────┘
                            ▼                  ▼
              ┌──────────────────────┐  ┌──────────────────────────┐
              │ L3: Redis (Upstash)  │  │ L4: Supabase Postgres    │
              │ • rate limit atomic  │  │ • primary: writes        │
              │ • maintenance flag   │  │ • read replica: reads    │
              │ • hot settings cache │  │ • Supavisor txn pooling  │
              │ • session revocation │  │ • pg_cron: refresh MV    │
              │ ~10K ops/s max       │  │ • partitions รายเดือน     │
              └──────────────────────┘  │ ≤1,500 q/s งบดุล         │
                                        └──────────────────────────┘
```

### 2.1 บทบาทแต่ละชั้น (คู่มือประกอบการตัดสินใจตอน implement)

| ชั้น | เก็บอะไร | TTL/นโยบาย | ทำไม |
|---|---|---|---|
| **L0 Browser/SWR** | ข้อมูลที่ UI ใช้ซ้ำ | SWR dedup เดิม | ฟรี ไม่ต้องทำอะไร |
| **L1 Edge** | ทุก public GET ที่เป็นธรรมชาติอยู่แล้ว: `/api/status`, `/api/status/history`, settings สาธารณะ | `s-maxage=30–60, swr=300` + purge เมื่อ maintenance toggle | request หยุดที่ edge = ถูกที่สุดเท่าที่มี |
| **L2 Micro-cache ใน process** | aggregate แพง (dashboard stats, analytics) | 5–15s SWR semantics | cache miss หลัง edge ยังไม่พัง DB — 10 instances × 15s = aggregate ทำงานแค่ 4 ครั้ง/นาที แทนที่จะทุก request |
| **L3 Redis** | rate limit counters, maintenance flag, site_settings hot copy, session revocation set | per-key | ต้อง atomic + แชร์ข้าม instance; Postgres ทำได้แต่แพงกว่า 10 เท่าตอน TPS สูง |
| **L4 Postgres** | source of truth ทั้งหมด | — | งบ q/s ≤ 1,500 บน primary + replica |

### 2.2 กฎเหล็กของสถาปัตยกรรมนี้

1. **Write ที่ต้องถูก 100%** (payments, auth, invoices) → Postgres ตรง ห้าม buffer ห้าม cache
2. **Write ที่ทนหายได้ชั่วคราว** (page views, analytics events, formula_usage) → in-process buffer, flush เป็น batch (≥100 rows หรือทุก 2s) — เอกสาร loss window ชัด: ถ้า instance ตาย ข้อมูล analytics ราว 2s ล่าสุดหาย ซึ่งยอมรับได้เชิงธุรกิจ
3. **Read ทุกตัวต้องถามก่อนว่า "cache ได้ไหม"** — ถ้าตอบไม่ได้ ต้องมีเหตุผลเขียนไว้ในโค้ด
4. **Rate limit ย้ายไป Redis** — Postgres RPC แบบเดิมที่วางไว้ใน v1 ยกเลิกเป็น primary (เหลือเป็น fallback ถ้า Redis ล่ม → fail-open ตาม policy เดิม)

---

## 3. Ground Rules (เหมือน v1)

1. ทำเป็น Phase แต่ละ phase ต้องผ่าน gate: `pnpm type-check` + `pnpm lint` + `pnpm test` + `pnpm build` เขียวทั้งหมด
2. แต่ละ phase = commit แยก — rollback ได้ทุกจุด
3. ห้ามผสมงาน cleanup กับงาน performance ใน commit เดียว
4. ทุก phase ที่แตะ runtime behavior ต้องมี load test ย่อยก่อนปิด phase (เอา k6 script จาก §7 มายิงเฉพาะ path ที่แตะ)
5. Feature flag ทุกการเปลี่ยนสถาปัตยกรรม (`SCALE_REDIS=on`, `SCALE_BUFFER=on` ฯลฯ) — พร้อมสวิตช์กลับไป path เดิมได้ทันทีโดยไม่ redeploy

---

## 4. แผนเป็น Phase (10 Phases)

### Phase 0 — Baseline & Audit
**เป้า:** มีตัวเลข "ก่อน" ครบ จะได้พิสูจน์ว่า "หลัง" ดีขึ้นจริง

- [ ] รันและจดผล: `type-check`, `lint`, `test`, `build` (เก็บ bundle size ต่อ route จาก build output)
- [ ] Route inventory จริงจาก `src/app/api/**/route.ts` — เอกสารเดิม drift แล้ว (พบ history, page-views, finance/revenue, finance/subscriptions ที่ไม่มีในเอกสาร)
- [ ] เขียน k6 baseline script (§7) แล้วยิงที่ **100 TPS 5 นาที** บน staging — จด p50/p95/p99, DB q/s, error rate ณ จุดที่โค้ดเดิมยังไหว
- [ ] จดค่าทั้งหมดลง `docs/baseline.md`
- [ ] สำรวจ import ที่อ้าง [math-data.ts](src/lib/math-data.ts) (เตรียม Phase 1)

**Acceptance:** มี baseline.md ครบทุกตัวเลข + k6 รันได้แบบ repeatable
**ขนาด:** S (1 วัน)

---

### Phase 1 — Dead Code Removal
- [ ] ลบ [math-data.ts](src/lib/math-data.ts) (214 บรรทัด orphan catalog) — ย้ายผู้อ้างอิงไป [formulas/registry.ts](src/lib/formulas/registry.ts)
- [ ] ตัดสินใจ Finance routes (คำถามเดียวที่ค้างจาก v1): เก็บ+ทดสอบ หรือ ลบ — ดูจากว่า dashboard FinancePage เรียกจริงหรือไม่ (ถ้าเรียก = เก็บ, ถ้า scaffold ลอย = ลบ)
- [ ] กวาด unused imports/exports, console.log ตกค้าง, CSS rules ไร้เจ้าของ
- [ ] ลบ re-export ที่ไม่มีใครใช้

**Acceptance:** build เขียว, smoke หน้าเว็บ + บอทปกติ, จำนวนบรรทัดรวมลดลงจาก baseline
**ขนาด:** S (1 วัน)

---

### Phase 2 — Test Safety Net
**เป้า:** ทุก phase หลังจากนี้แตะ logic — ต้องมีตาข่ายก่อน

- [ ] **Table-driven test 45 สูตร** ใน [registry.ts](src/lib/formulas/registry.ts): known input → known output + edge case (0, ค่าลบ, หารศูนย์, ทศนิยม, Infinity)
- [ ] Test [calc-utils.ts](src/lib/calc-utils.ts) ครบทุก branch (comma, unicode minus, `x10^`, scientific notation, div-by-zero, NaN)
- [ ] Test bot `buildEmbed` (pure อยู่แล้ว แค่ยังไม่มี test), [api-response.ts](src/lib/api-response.ts) ทุก helper
- [ ] Test โครงสร้าง response ของ route ทั้ง 10 ตระกูลด้วย mock Supabase (integration เบา ๆ) — ป้องกัน Phase 6 ทำ contract พัง
- [ ] ตั้ง coverage threshold เริ่มต้น 40% สำหรับ `src/lib/**` และไต่ขึ้นทีละ phase

**Acceptance:** test จำนวน ≥ 60 (จากเดิม 5 ไฟล์), ทุกอย่างเขียว
**ขนาด:** M (1–2 วัน)

---

### Phase 3 — Correctness Fixes (P0 เดิม + ปรับเป้าตามสถาปัตยกรรม 10K)

#### 3a. Rate limiter → Redis atomic (อัปเกรดจากแผน v1)
- [ ] เพิ่ม `@upstash/ratelimit` + `@upstash/redis` (หรือ Vercel KV ถ้า host บน Vercel ทั้งหมด — เลือกตาม deployment จริงใน Phase 0)
- [ ] Fixed-window หรือ sliding-window ต่อ key เดียวจบใน 1 Redis op (`INCR`+`EXPIRE` ผสมใน pipeline) — atomic โดยพื้นฐาน แก้ race ไปในตัว
- [ ] คงพฤติกรรมเดิม: `checkRateLimit` = fail-open เมื่อ Redis ล่ม, `checkRateLimitStrict` = fail-closed
- [ ] ลบ dependency ของ rate limit ต่อ Postgres — แต่ migration `009_rate_limit_cleanup.sql` เก็บ RPC fallback ไว้แบบ opt-in (`RATE_LIMIT_BACKEND=postgres|redis`)
- [ ] เขียน interface `RateLimiter` เดียว ให้ทั้ง 7 จุดเรียก (จุดเรียกเดิมทั้งหมดแก้ import อย่างเดียว — พฤติกรรมเหมือนเดิม)

#### 3b. Maintenance mode → Redis + site_settings (dual-write)
- [ ] Source of truth = `site_settings` (มีอยู่แล้ว) / **hot read = Redis** (TTL 10s)
- [ ] [state.ts](src/lib/admin/state.ts) กลายเป็น facade: write = DB + Redis invalidate, read = Redis → miss แล้วค่อย DB
- [ ] ผู้อ่านทั้ง 3 ([admin/control](src/app/api/admin/control/route.ts), [settings](src/app/api/settings/route.ts), [status](src/app/api/status/route.ts)) แก้เฉพาะข้างใน facade — caller เหมือนเดิม
- [ ] พฤติกรรมบน serverless ถูกต้องทุก instance (แก้บั๊กเดิม) และไม่เพิ่ม DB load

**Acceptance:** toggle ผ่านบอท → status page เห็นภายใน TTL ทุก instance; rate limit ยังกันยิงซ้ำได้แม้ Redis ล่ม (strict path)
**ขนาด:** M (1–2 วัน)

---

### Phase 4 — Data Layer for Scale (หัวใจของ 10K TPS)
**เป้า:** ทำให้ Postgres "จบงานที่ต้องจบ" และ "ไม่ทำงานที่ไม่ต้องทำ"

#### 4a. Migration ชุดใหม่ (009–011)
- [ ] `009_analytics_partitions.sql` — แปลง `analytics_events`, `page_views`, `audit_logs` เป็น **partitions รายเดือน** (`PARTITION BY RANGE (created_at)`) + ฟังก์ชันสร้าง partition ล่วงหน้า 3 เดือน + pg_cron รันรายเดือน; ตารางเก่าย้ายข้อมูลแบบ backfill script
- [ ] `010_search_and_count_indexes.sql` —
  - `pg_trgm` GIN index บน `users(email)`, `users(name)` สำหรับ `ilike '%search%'`
  - covering index สำหรับ sort ปกติ: `(created_at DESC)` บนทุกตารางที่ list มาก่อน
  - `analytics_events (path, created_at DESC)`, `formula_usage (formula_id, created_at)`
- [ ] `011_materialized_views.sql` — MV สำหรับทุก aggregate ที่ dashboard ใช้: `mv_traffic_30d`, `mv_funnel_7d`, `mv_formula_usage_30d`, `mv_revenue_summary` + pg_cron refresh ทุก 5 นาที (REFRESH CONCURRENTLY)

#### 4b. Connection pooling
- [ ] บังคับผ่าน **Supavisor transaction mode** (port 6543) ทั้ง app — `prepared statements` ต้องปิดตามข้อกำหนดของ transaction mode (เช็ค supabase-js ไม่ใช้ prepared statement ฝั่ง server โดยดีฟอลต์)
- [ ] ตั้ง pool size ตามจำนวน instance ที่วางแผน (เช่น 50/instance × 10 = 500 < max_connections ที่ replica รับได้)
- [ ] เพิ่ม `read replica routing` — ทุก query อ่านล้วน (analytics, users list, status history) ยิงเข้า replica ผ่าน client ที่สอง (`getSupabaseRead()`), ทุก write อยู่ primary

#### 4c. Fire-and-forget write buffer
- [ ] สร้าง `lib/buffered-writer.ts`: buffer in-process + flush อัตโนมัติที่ (≥100 rows) OR (ทุก 2s) → batch INSERT ตาราง analytics
- [ ] เอามาใช้กับ: [page-views/route.ts](src/app/api/page-views/route.ts) (แก้เป็น push buffer แล้วตอบ 202 ทันที), formula usage tracking, audit log ที่ไม่ใช่ความถูกต้องเชิงเงิน
- [ ] Flush path ต้อง catch-all — buffer ล้น/DB ล่ม = drop + log ครั้งเดียว (ไม่ kill request)
- [ ] เขียน test: flush ที่ threshold, ตอบ 202 ก่อน flush, ไม่มี unhandled rejection

#### 4d. Query surgery (แก้ query แพงจาก §0.2)
- [ ] [users/route.ts](src/app/api/users/route.ts): เปลี่ยน `count: "exact"` → estimate count (`reltuples` ผ่าน RPC หรือ count แบบ cached 30s) ยกเว้นหน้าแรก; `paid` filter เปลี่ยนจาก fetch ทั้ง subscriptions → subquery/join
- [ ] Analytics routes ทั้ง 5 เปลี่ยนจาก aggregate สด → อ่าน MV (Phase 4a) + micro-cache 15s (Phase 5)
- [ ] [status/route.ts](src/app/api/status/route.ts): health check จริงเกิดที่ background job (60s รอบ) เขียนผลลง Redis แล้ว route อ่าน Redis อย่างเดียว — ไม่มี route ไหนไปเรียก Stripe/SMTP/Discord สดอีก
- [ ] [register/route.ts](src/app/api/auth/register/route.ts): แยกส่ง email ออกจาก request path → เข้าคิวเบา (QStash หรือ bg job ผ่าน buffered flush ตาราง `email_queue`) — user ได้ response ใน <200ms เสมอ

**Acceptance:** DB q/s ที่ 1,000 TPS (k6) ≤ 150 q/s; p99 users list < 400ms ที่ 100K users จำลอง; หน้า dashboard อ่านจาก MV ได้ครบ
**ขนาด:** L (3–4 วัน) — phase หนักสุดของแผน

---

### Phase 5 — Edge Caching & Micro-cache
- [ ] เพิ่ม `Cache-Control` บน public GET ทั้งหมด:
  - `/api/status` → `s-maxage=30, stale-while-revalidate=300` (แทน in-memory 60s เดิม)
  - `/api/status/history` → `s-maxage=300, swr=3600`
  - settings สาธารณะ, formulas meta → `s-maxage=3600`
- [ ] Purge hook: ตอน toggle maintenance / settings write → ส่ง purge (Vercel API หรือ revalidate tag)
- [ ] `lib/micro-cache.ts`: in-process cache แบบ stale-while-revalidate (serve ของเก่าทันที + refresh พื้นหลัง) ใช้กับ dashboard aggregates และ admin reads
- [ ] Authenticated responses ห้าม cache ที่ edge (มี Set-Cookie/JWT) — ใช้แค่ L2/L3
- [ ] เขียน test ว่า header ออกถูกทุก route + contract body ไม่เปลี่ยน

**Acceptance:** k6 ที่ 5,000 TPS บน public GET → origin traffic ≤ 15%; maintenance toggle กระจายภายใน ≤ 35s (30 edge + TTL)
**ขนาด:** M (1–2 วัน)

---

### Phase 6 — API Layer Consolidation (จาก v1 คงเดิม + ผูกกับ cache)
- [ ] Route factory `defineRoute({ auth: "admin"|"user"|"public"|"hmac", schema, cache, rateLimit, handler })` รวมท่อหน้า: gate → rate limit → Zod → try/catch → api-response → audit → cache header
- [ ] ย้าย route ทีละตระกูล: admin/settings → users → analytics/stats/status → auth/payments (Stripe webhook เว้น raw-body พิเศษ) → finance/history/page-views
- [ ] เป้าเฉลี่ย < 80 บรรทัด/route; ปิดเรื่อง "reimplement gate" ให้สนิท
- [ ] Contract test จาก Phase 2 ต้องยังเขียวทุกตระกูลหลังย้าย

**Acceptance:** ทุก route ผ่าน factory, contract test เขียว, ไม่มี route ใดมี try/catch boilerplate เอง
**ขนาด:** L (3 วัน)

---

### Phase 7 — Frontend Restructure (ธีมเดิม 100%)
#### 7a. i18n unify
- [ ] สำรวจซ้อนกันของ [LanguageContext.tsx](src/lib/LanguageContext.tsx) + [translations.ts](src/lib/translations.ts) (843 บรรทัด) + `dashboard/i18n/`
- [ ] รวม provider เดียว + dictionary แยกไฟล์ตาม namespace (`common/auth/formulas/dashboard/status`) — **ชื่อ key คงเดิมทั้งหมด**
- [ ] Dynamic import dictionary per namespace → ลด first-load JS (translations 843 บรรทัดไม่ควรโหลดทั้งก้อนบนหน้า login)

#### 7b. แตก component ใหญ่ (แตกไฟล์+hook เท่านั้น ห้ามเปลี่ยน DOM/CSS)
| ไฟล์ | บรรทัด | แผนแตก |
|---|---|---|
| [Sidebar.tsx](src/components/Sidebar.tsx) | 438 | nav data + collapse hook + subcomponents |
| [LoginClient.tsx](src/components/login/LoginClient.tsx) | 385 | form fields + oauth section + validation hook |
| [FormulaCard.tsx](src/components/formulas/FormulaCard.tsx) | 372 | input row + result display + error banner |
| [AppShell.tsx](src/components/AppShell.tsx) | 352 | layout chrome vs language/state orchestration |

#### 7c. Shared UI primitives
- [ ] ยกระดับ `dashboard/ui` (KpiCard, Panel, Skeleton) เป็น shared primitives ที่หน้า public ใช้ร่วมได้ — ลด duplication

**Acceptance:** screenshot ก่อน/หรือหลังต่างกัน 0 px ในส่วนที่ห้ามแตะ; first-load JS ของหน้า login ลดลงวัดได้
**ขนาด:** L (3–4 วัน)

---

### Phase 8 — Performance Hardening + Load Test จริง
- [ ] `mathjs` → dynamic import เฉพาะ path ที่คำนวณจริง (มันคือ dependency ใหญ่สุดใน bundle)
- [ ] Recharts → dynamic import เฉพาะ dashboard + status
- [ ) [proxy.ts](src/proxy.ts) ตรวจ matcher ให้แคบที่สุด (middleware วิ่งทุก request ทั้งที่ไม่ต้อง)
- [ ] React: memo เฉพาะจุดที่วัดแล้ว render ซ้ำจริง (FormulaGrid 45 ใบ, UsersPage table) — วัดก่อนเสมอ ห้าม memo กระจาย
- [ ] SWR tuning: analytics pages ปิด `revalidateOnFocus`, dashboard 30s dedup
- [ ] **Load test ladder ด้วย k6 (§7):** 1,000 → 2,500 → 5,000 → 10,000 TPS รอบละ 10 นาที
- [ ] ปรับจนผ่านเกณฑ์ acceptance ทั้งหมด (ตารางใน §7.2)

**Acceptance:** 10,000 TPS sustained 10 นาที ผ่าน SLO ทุกข้อ
**ขนาด:** L (2–3 วัน)

---

### Phase 9 — Docs, Runbooks & Observability ปิดงาน
- [ ] อัปเดต [CODEBASE-SUMMARY.md](CODEBASE-SUMMARY.md) + README ให้ตรงโครงใหม่
- [ ] Runbook: ถ้า Redis ล่ม / replica lag / buffer ล้น / Postgres CPU > 80% — ทำอย่างไร ใครรับผิดชอบ (เชื่อม alert เข้า Discord webhook ที่มีอยู่แล้ว)
- [ ] เพิ่ม metrics ที่หายไป: cache hit ratio ต่อชั้น, buffer flush lag, DB q/s, Redis op/s — รายงานเข้า health report ของบอท (12h cron) ที่มีอยู่แล้ว
- [ ] SLO dashboard: p50/p95/p99 ต่อ route, error rate, origin traffic %

**ขนาด:** S (1 วัน)

---

## 5. ลำดับพึ่งพา

```
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
            └─────┬─────┘
   Phase 2 เป็น safety net ของ 3–8
   Phase 4 (data) ต้องมาก่อน 5 (cache) — cache ทับ query แพงไม่ได้ ต้องแก้ที่ราก
   Phase 8 (load test) ทำได้เมื่อ 3–5 ครบ เพราะไม่งั้นผล test สะท้อน bottleneck เดิม
```

## 6. เกณฑ์ SLO รวมของระบบ (หลังจบทั้งแผน)

| Metric | เป้า |
|---|---|
| Throughput | 10,000 TPS sustained ≥ 10 นาที |
| Latency (cached reads) | p50 < 30ms, p99 < 120ms |
| Latency (uncached reads via replica) | p50 < 100ms, p99 < 500ms |
| Latency (auth writes) | p99 < 800ms |
| Error rate | < 0.1% ระหว่าง load test |
| Postgres q/s ณ 10K TPS | ≤ 1,500 (primary+replica รวม) |
| Cache hit ratio (L1) | ≥ 85% ของ public GET |
| Data loss window (analytics) | ≤ 2 วินาที (documented, accepted) |

## 7. Load Testing (k6)

### 7.1 Script โครง (เขียนจริงใน Phase 0)
```js
// tests/load/smoke.js — โครงอ้างอิง
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    reads: {
      executor: "constant-arrival-rate",
      rate: __ENV.TPS, timeUnit: "1s",
      duration: "10m",
      preAllocatedVUs: 500, maxVUs: 2000,
    },
    writes: { /* page-views + register ที่ 15% / 3% ของ TPS */ },
  },
  thresholds: {
    http_req_duration: ["p(50)<30", "p(99)<500"],
    http_req_failed: ["rate<0.001"],
  },
};

export default function () {
  // 70% GET /api/status + /api/status/history (cacheable)
  // 15% POST /api/page-views (unique path ต่อ iteration)
  // 10% GET admin reads (มี cookie จริงจาก setup)
  //  5% POST auth/payment paths (sandbox keys)
}
```

### 7.2 เกณฑ์ผ่านต่อรอบ ladder

| รอบ | TPS | ต้องผ่าน |
|---|---|---|
| Baseline (Phase 0) | 100 | โค้ดเดิมไม่พัง — จดตัวเลขทุกอย่าง |
| M1 (หลัง Phase 4) | 1,000 | DB q/s ≤ 150, p99 < 600ms |
| M2 (หลัง Phase 5) | 5,000 | origin ≤ 15% ของ public GET, p99 cached < 120ms |
| M3 (หลัง Phase 8) | 10,000 | ทุก SLO ใน §6 ผ่านครบ 10 นาที |

## 8. Risk Register

| ความเสี่ยง | ผลกระทบ | มาตรการ |
|---|---|---|
| Redis ล่ม | rate limit fail-open ชั่วคราว, maintenance flag อ่านช้าลง | strict path fail-closed คงเดิม + Postgres RPC fallback (opt-in) + alert ทันที |
| Partition migration ผิดพลาด | ข้อมูล analytics เสียหาย | backfill script แบบ dry-run + ตรวจ count ก่อน/หลัง + migration บน staging ก่อนเสมอ |
| MV refresh ค้าง | dashboard อ่านของเก่า | `REFRESH CONCURRENTLY` + timeout + alert; ยอมรับความหน่วงข้อมูล 5 นาที (เอกสารแล้ว) |
| Buffer หายตอน instance ตาย | analytics ขาด 2s | accepted ตาม §2.2 กฎ 2; ระบุใน runbook |
| ต้นทุน infra พุ่ง | งบเดือน | ดู §9 ก่อนเริ่ม Phase 4 — ถ้างบไม่พอ ให้ปรับเป้าจริงเป็น 3,000 TPS แทนการทำครึ่ง ๆ |
| Contract พังจาก factory | ทุก client พังพร้อมกัน | contract test จาก Phase 2 + ย้ายทีละตระกูล + feature flag กลับ path เดิม |

## 9. ต้นทุน Infra เพิ่มเติม (ประมาณการ เพื่อตัดสินใจก่อนเริ่ม)

| รายการ | จุดประสงค์ | ระดับต้นทุน |
|---|---|---|
| Upstash Redis (pay-as-you-go) | rate limit + hot cache ~10K ops/s | ต่ำ–กลาง |
| Supabase read replica | แยก read traffic | กลาง–สูง (ตัวแพงสุดของแผน) |
| pg_cron (built-in Supabase) | refresh MV + partitions | ฟรี |
| QStash หรือตาราง email_queue | email ไม่ block request | ต่ำ |
| Vercel Fluid Compute / Enterprise | 10K TPS บน serverless | ตรวจกับ quota จริง — ถ้าเกิน พิจารณา self-host Node cluster ผ่าน PM2 (มี [ecosystem.config.js](ecosystem.config.js) อยู่แล้ว) หลัง LB |

> **ทางเลือก B (self-host):** ถ้า Vercel แพงเกิน โค้ดจากแผนนี้วิ่งบน Node cluster + Nginx + PM2 ได้ทันที เพราะไม่ผูกกับ Vercel API เฉพาะ (ยกเว้น purge hook — มี adapter interface ให้เปลี่ยนได้)

## 10. Out of Scope (เหมือน v1)

- เปลี่ยนธีมสี/แบรนด์/ชื่อ, API contract, auth stack, deployment model โดยปริยาย
- เขียน feature user-facing ใหม่
- Multi-region DB, sharding, Kafka-class event streaming — เกินความจำเป็นของ 10K TPS แบบนี้ (ถ้าวันหนึ่งต้อง 100K TPS ค่อยคุยใหม่)

## 11. ประมาณการรวม

| Phase | ขนาด | วัน (คนเดียว, full-time) |
|---|---|---|
| 0 Baseline | S | 1 |
| 1 Dead code | S | 1 |
| 2 Test net | M | 1.5 |
| 3 Correctness | M | 1.5 |
| 4 Data layer | **L** | 3.5 |
| 5 Caching | M | 1.5 |
| 6 API factory | L | 3 |
| 7 Frontend | L | 3.5 |
| 8 Perf + load test | L | 2.5 |
| 9 Docs/runbook | S | 1 |
| **รวม** | | **≈ 20 วันทำงาน** (buffer 25% → ~25 วัน) |

---

*จบแผน v2.0 — เริ่มได้จาก Phase 0 เสมอ · ทุกตัวเลขในแผนนี้ต้องถูกพิสูจน์ด้วย load test ไม่ใช่ความเชื่อ*
