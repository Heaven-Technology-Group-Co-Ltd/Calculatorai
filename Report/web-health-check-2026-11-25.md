# Web System Health Check — Premium Math Calculator

**วันที่:** 2026-11-25 15:25 (Asia/Bangkok) · **rev 2** (เพิ่มการตรวจ production จริงบน Netlify)
**Commit:** `d2b754b` (`main`, ประวัติมี commit เดียว) · working tree clean
**Production:** https://calculatorai.click → Netlify (A record `75.2.60.5`, `Server: Netlify`)
**Local:** Node v24.21.0, pnpm 11.0.9, Next.js 16.2.6
**ขอบเขต:** web app + Discord bot, read-only

> **แก้ไขจาก rev 1:** rev 1 ตรวจแต่ localhost แล้วสรุปว่า "ระบบรันไม่ได้เพราะไม่มี env". ผิด.
> env อยู่บน Netlify ตามที่ควรเป็น. การที่ local ตอบ 500 เป็นเรื่องปกติของการ checkout ใหม่ที่ไม่มี `.env.local`.
> rev 2 ตรวจ production จริงเป็นหลัก.

---

## สรุปผู้บริหาร

**Production ทำงานได้.** Supabase, Stripe, SMTP ต่อได้หมด, auth gate ทำงาน, validation ทำงาน, CSRF กันได้.
หน้าเว็บทุกหน้าตอบ 200 ยกเว้นหน้าที่กันไว้ตามดีไซน์.

**แต่ status page ของระบบเองฟ้องว่าพังตลอดเวลา** เพราะ checker สองตัวมีบั๊ก:
- `nextjs` → `Health endpoint unreachable` (อ่าน env ผิดชื่อ)
- `discord` → `Bot token not configured` (เช็ค env ของ web แทนที่จะเช็ค heartbeat ของ bot)

ผลคือ `/status` ขึ้น `"status":"degraded"` และ uptime 24 ชม. = **58.7%** ทั้งที่ระบบหลักปกติ.
นี่คือ finding ที่ต้องแก้ ไม่ใช่เรื่อง env.

---

## 1. Production (Netlify) — ผลตรวจสด

### 1.1 Endpoint

| endpoint | status | เวลา | หมายเหตุ |
|---|---|---|---|
| `/` | 200 | 411 / 121 / 138 / 126 ms | Netlify Durable cache hit |
| `/login` `/signup` `/status` `/purchase` | 200 | 360-1000 ms | |
| `/api/health` | 200 | ~380 ms คงที่ | `{"ok":true,"uptime":2045}` |
| `/dashboard` | 307 → `/login` | 432 ms | gate ถูกต้อง |
| `/formulas-demo` | 404 | 342 ms | ถูกต้อง (ปิดใน prod) |
| `/api/stats` `/api/users` `/api/history` `/api/settings` `/api/finance/revenue` `/api/analytics/traffic` `/api/auth/admin-check` | 401 | 620-1050 ms | auth gate ทำงาน |
| `/api/users/123` | 401 | | `Authentication required` |
| `/api/status` | 200 | 1036-1204 ms | ข้อมูล health จริง |
| `/api/auth/session` | 200 | 822 ms | `{}` (ยังไม่ล็อกอิน) |
| `/api/auth/csrf` | 200 | 833 ms | token ออกปกติ |
| `/api/payments/status` | 400 | 974 ms | validate ขาด session_id |
| `/api/payments/webhook` POST | 400 | | `Missing signature` ถูกต้อง |
| `/api/payments/create-checkout-session` POST | 400 | | zod validation ทำงาน |
| `/api/auth/register` POST `{}` | 400 | | zod validation ทำงาน |
| `/api/auth/forgot-password` POST `{}` | 400 | | zod validation ทำงาน |
| `/api/page-views` GET | 405 | 376 ms | POST-only |
| `/api/history/abc` GET | 405 | | |
| `/api/does-not-exist` | 404 **HTML** | | ดูข้อ 2.4 |
| `/status/history` | 404 HTML | | ไม่มี page นี้ (มีแต่ API) |

**สรุป:** ไม่มี 500 เลยบน production. handler ทุกตัวที่ทดสอบตอบตามสัญญา.

### 1.2 Data layer จริง

`/api/status` คืนค่าจาก DB สด:

```json
"checks": {
  "supabase": {"status":"ok","latencyMs":314},
  "stripe":   {"status":"ok","latencyMs":142},
  "smtp":     {"status":"ok","latencyMs":19},
  "discord":  {"status":"error","latencyMs":0,"message":"Bot token not configured"},
  "nextjs":   {"status":"error","latencyMs":2,"message":"Health endpoint unreachable"}
}
```

Supabase ต่อได้, อ่านตาราง `bot_heartbeats`/`health_history` ได้, migrations ทั้ง 9 ตัวน่าจะ apply แล้ว (ข้อมูล 30 วันมีจริง 1000 checks).

### 1.3 CSRF gate ผ่านการทดสอบจริง

```
POST /api/users  Origin: https://evil.example      → 403 {"error":"CSRF validation failed"}
POST /api/users  Origin: https://calculatorai.click → 405 (ไม่มี POST handler, ผ่าน CSRF มาแล้ว)
```

### 1.4 Security headers (จาก response จริง)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
X-Frame-Options: DENY                    ← ออกครั้งเดียว ไม่ซ้ำ
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Cache-Control: no-store, must-revalidate, no-cache, max-age=0, private
Server: Netlify
```

header ประกาศซ้ำสองที่ (`next.config.ts` และ `src/proxy.ts`) แต่ Next รวมให้เหลือค่าเดียว. **proxy/middleware ทำงานบน Netlify จริง** (ยืนยันจาก Permissions-Policy + Cache-Control ที่มาจาก proxy).

---

## 2. Finding

### 2.1 [สูง] `checkNextjs` อ่าน env ผิดชื่อ → status page แดงตลอด

`src/app/api/status/route.ts:133`
```ts
const base = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
const res = await fetch(`${base}/api/health`, ...);
```

ทั้งโปรเจกต์ใช้ชื่อ `NEXT_PUBLIC_APP_URL` (6 จุด: `auth/register`, `auth/forgot-password`, `payments/create-checkout-session`, test) แต่จุดนี้จุดเดียวใช้ `NEXT_PUBLIC_URL`.
ถ้า Netlify ตั้งไว้แค่ `NEXT_PUBLIC_APP_URL` → fallback ไป `http://localhost:3000` → fetch ล้มเหลวทุกครั้ง → `"Health endpoint unreachable"`.

**หลักฐานวินิจฉัย:** ภายนอกยิง `/api/health` ได้ 200 ใน 380ms แต่ checker ในฟังก์ชันเดียวกันบอก "unreachable", latency 2ms (ต่ำกว่าที่จะยิงเน็ตเวิร์กได้ด้วยซ้ำ).

**ผลกระทบ:** `nextjs` uptime 0% ใน 24 ชม./7 วัน (30 วัน 92%), เกิด 15-16 incidents. status page ขึ้น degraded ตลอด.

**แก้:** `process.env.NEXT_PUBLIC_APP_URL ?? process.env.URL ?? "http://localhost:3000"` (`URL` เป็น env ที่ Netlify ใส่ให้เอง) หรือเรียก `checkHealth()` ตรงๆ ในโปรเซสเดียวกัน ไม่ต้องยิง HTTP ออกจากฟังก์ชันไปหาตัวเอง.

### 2.2 [สูง] `checkDiscord` เช็ค env ของ web แทน heartbeat ของ bot

`src/app/api/status/route.ts:156`
```ts
if (!process.env.DISCORD_BOT_TOKEN) {
  return { status: "error", message: "Bot token not configured" };
}
```

Bot เป็น process แยก (`discord-bot/`, Gateway connection, รันบน VPS ไม่ใช่ Netlify function). การที่ web ไม่มี token ไม่ได้แปลว่า bot ล่ม. และถ้า web มี token จริงก็ไม่ควรเอาไปเช็คกับ Discord API ทุกครั้งที่เปิดหน้า status.

**หลักฐาน:** production คืน `"Bot token not configured"` ทั้งที่ตาราง `bot_heartbeats` (migration `006_bot_heartbeats.sql`) มีอยู่แล้วและ route นี้ก็อ่านมันในบรรทัดที่ 183 แต่ไม่เคยไปถึงเพราะ gate ด้านบนตัดก่อน.

**แก้:** อ่าน `bot_heartbeats.last_seen` ก่อน แล้วค่อยใช้ threshold 2 ชม. ที่มีอยู่แล้ว. ลบการพึ่ง env ของ web ออก.

**ผลข้างเคียงที่ต้องยืนยัน:** ไม่รู้ว่า bot รันอยู่จริงหรือไม่. repo ไม่มี deploy config ของ bot (`ecosystem.config.js` เป็น pm2 ของ `pnpm start` ที่รวม bot แต่ bot ต้องมี `discord-bot/.env` ซึ่ง gitignore). 30 วันก่อน Discord uptime 92.5% แปลว่าเคยทำงาน.

### 2.3 [กลาง] สถานะรวมของ status page จึงไม่สะท้อนความจริง

```
"status": "degraded"
24h: uptimePct 58.7, incidents 31   ← จาก checker ที่ผิด 2 ตัว
30d: uptimePct 96.5, incidents 35
```

ผลลัพธ์ที่ผู้ใช้เห็นคือหน้า status บอกว่าระบบมีปัญหา ทั้งที่ supabase/stripe/smtp ok. ตัวเลข incident 31 ครั้งใน 24 ชม. มาจาก checker ที่ fail ทุกชั่วโมง ไม่ใช่เหตุจริง.

### 2.4 [กลาง] `/api/*` ที่ไม่มีอยู่ ตอบ HTML ไม่ใช่ JSON

`GET /api/does-not-exist` → 404 + HTML page ของ App Router (9351 bytes, ยืนยันบน production).
client ที่ `res.json()` จะ throw `Unexpected token '<'`.
แก้ด้วย route handler `src/app/api/[...path]/route.ts` ที่คืน 404 JSON.

### 2.5 [กลาง] `/api/status` เป็น public และไม่มี throttle ที่วัดได้

- ไม่ต้อง auth, คืนข้อมูล infra latency + สถานะ env ทุกครั้ง
- แต่ละครั้งยิงออกนอก 4-5 ปลายทาง (`totalLatencyMs` ~1.4s) → เปิดช่องให้คนอื่นใช้เป็นตัวขยาย load
- ยิงติดกัน 8 ครั้ง → 200 ทั้ง 8, ไม่มี 429

**ยังไม่สรุปว่าไม่มี rate limit** (8 ครั้งน้อยกว่าเพดานทั่วไป). ที่ยืนยันได้: ที่อัตรานี้ไม่มีการจำกัด และ route นี้ทำงานหนักต่อ request มากที่สุดในระบบ.

### 2.6 [ต่ำ] `X-Powered-By: Next.js` เปิดอยู่บน production
ปิดด้วย `poweredByHeader: false` ใน `next.config.ts`.

### 2.7 [ต่ำ] Netlify config ทั้งหมดอยู่ใน UI ไม่มีใน repo

ไม่มี `netlify.toml`, ไม่มี `.nvmrc`, ไม่มี `engines` ใน `package.json`, ไม่มี `.github/`.
แปลว่า build command, publish dir, Node version, และ env ทั้งหมดถูกตั้งในหน้า Netlify UI เท่านั้น.
ตรวจจาก repo ไม่ได้, ทำซ้ำไม่ได้, และ `Next.js 16` เป็นเวอร์ชันใหม่ที่ Netlify adapter ต้องรองรับ (ตอนนี้รองรับแล้วเพราะ build ผ่าน).
ควรมี `netlify.toml` + `engines.node` อย่างน้อย.

### 2.8 [ต่ำ] Durable cache เก็บ HTML ที่ประกาศ `Cache-Control: no-store`
```
Cache-Status: "Netlify Durable"; hit; ttl=31533606 (~1 ปี)
Age: 2394
```
`/` เป็น prerendered อยู่แล้วจึงไม่เสียหาย แต่หลัง deploy ต้องยืนยันว่า cache ถูก invalidate. ถ้าเคยเจอ "แก้แล้วแต่หน้าไม่เปลี่ยน" นี่คือสาเหตุ.

### 2.9 [ต่ำ] Lint แดง 6 errors
`pnpm lint` exit 1: `react-hooks/set-state-in-effect` ที่ `StatusClient.tsx:76`, `UserDetailModal.tsx:73`, `InvoiceTable.tsx:37`, `RefundTable.tsx:34`, `InfoModal.tsx:29`, `LanguageContext.tsx:32`.
เป็นของเดิมที่ `Log.txt` ล็อกเพดานไว้ ไม่มีตัวใหม่. ไม่ได้บล็อก deploy เพราะ Netlify ไม่ได้รัน lint.

### 2.10 [ต่ำ] git worktree ค้าง 5 ตัว (`prunable`) บน `E:`
`audit-wt-aetox`, `audit-wt-G`, `audit-wt-H`, `audit-wt-I`, `audit-wt-J`. `git worktree prune` เคลียร์ได้.

---

## 3. ผลตรวจฝั่ง local (ไม่ใช่ตัวชี้วัด production)

เก็บไว้เป็น baseline ของ checkout ใหม่:

| ด่าน | ผล |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ 525 packages, 7.1s |
| `pnpm type-check` | ✅ 0 errors |
| `pnpm test` | ✅ 19 ไฟล์ / 87 tests, 784ms |
| `pnpm build` | ✅ 30.0 MB / 1007 files, 16 prerendered routes |
| `discord-bot` `tsc --noEmit` | ✅ 0 errors |
| `pnpm lint` | ❌ 6 errors (ข้อ 2.9) |
| API บน localhost | 500 ทั้งหมด ← **คาดไว้แล้ว** เพราะไม่มี `.env.local` |

**env ที่ production ต้องมี** (ตรวจจาก grep `process.env` ทั้ง `src/`, 21 ตัว):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMTP_HOST/PORT/USER/PASS/FROM`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_API_SHARED_SECRET`, `DISCORD_ADMIN_WEBHOOK_URL`, และตามข้อ 2.1 คือ `NEXT_PUBLIC_URL`.

จากพฤติกรรม production: supabase ✅ stripe ✅ smtp ✅ → ตัวที่ขาดคือ `DISCORD_BOT_TOKEN` (ใน web env) และ `NEXT_PUBLIC_URL`.

---

## 4. สิ่งที่ยังยืนยันไม่ได้

1. Login / signup / verify email จริง (ต้องมีบัญชี)
2. Stripe checkout เต็ม flow (`4242`, `{CHECKOUT_SESSION_ID}`, cancel banner)
3. Dashboard 5 tab (`overview`, `users`, `finance`, `analytics`, `settings`) — ต้อง session admin
4. Discord bot รันอยู่จริงไหม (ต้องเข้าถึง VPS/pm2 หรืออ่าน `bot_heartbeats` ด้วย service key)
5. Email ส่งจริง (SMTP TCP ต่อได้ แต่ไม่รู้ว่า auth/send ผ่าน)
6. Stripe webhook รับ event จริง (ทดสอบได้แค่ `Missing signature`)

---

## 5. ลำดับที่ควรทำต่อ

| # | งาน | ไฟล์ | ผล |
|---|---|---|---|
| 1 | แก้ env ใน `checkNextjs` | `src/app/api/status/route.ts:133` | nextjs กลับเป็น ok, uptime ขึ้น |
| 2 | `checkDiscord` อ่าน heartbeat ก่อนเช็ค token | `src/app/api/status/route.ts:156-183` | discord สะท้อนความจริง |
| 3 | JSON 404 สำหรับ `/api/*` | `src/app/api/[...path]/route.ts` (ใหม่) | client ไม่พัง |
| 4 | `poweredByHeader: false` | `next.config.ts` | ลด fingerprinting |
| 5 | เพิ่ม rate limit ให้ `/api/status` | route เดียวกัน | กัน amplification |
| 6 | `netlify.toml` + `engines.node` | root | deploy ทำซ้ำได้ |
| 7 | lint 6 errors | 6 ไฟล์ตามข้อ 2.9 | CI เขียว |
| 8 | `git worktree prune` | - | คืนดิสก์ |

ข้อ 1-2 คือหัวใจ. แก้สองจุดนี้ status page กลับมาพูดความจริง ซึ่งเป็นเครื่องมือที่ใช้ตัดสินใจเรื่องอื่นต่อ.

---

## ภาคผนวก

### โครงสร้าง
- หน้า: 9 (`/`, `/dashboard/[[...tab]]`, `/formulas-demo`, `/login`, `/purchase`, `/purchase/success`, `/reset-password`, `/signup`, `/status`, `/verify`)
- API route: 39 ไฟล์ `route.ts`
- Migrations: 9 (`001_initial_schema` → `009_verification_token_types`)
- Source: `src/` 237 ไฟล์, `discord-bot/` 65 ไฟล์
- Prerendered: 16 routes (รวม `/dashboard` 5 tab)

### คำสั่งที่ใช้ตรวจ
```powershell
# local
pnpm install --frozen-lockfile; pnpm type-check; pnpm lint; pnpm test; pnpm build
cd discord-bot; .\node_modules\.bin\tsc.cmd --noEmit
next start -p 3100            # แล้วยิง 24 endpoint

# production
Invoke-WebRequest https://calculatorai.click/api/status
Invoke-WebRequest https://calculatorai.click/api/health
# + 24 endpoint, 4 รอบ latency, CSRF 2 เคส, burst 8 ครั้ง
```

### หมายเหตุสภาพแวดล้อม
- `node_modules` และ `.next` ไม่มีตอนเริ่ม rev 1 → ติดตั้งและ build ใหม่ (gitignored ทั้งคู่)
- `pnpm.ps1` / `npx.ps1` ถูก ExecutionPolicy บล็อก → ต้องเรียกผ่าน `.cmd`
- repo มี commit เดียว (`d2b754b`) → ตรวจย้อนหลังเชิงประวัติไม่ได้ ตัวเลข 30 วันมาจาก DB เท่านั้น
