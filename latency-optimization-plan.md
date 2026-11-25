# Latency Optimization Plan

## 1. Current State Analysis

| Service | Latency | Root Cause | Fixable? |
|---------|---------|------------|----------|
| SMTP | ~1000ms | `transporter.verify()` — full SMTP handshake ทุกครั้งที่ cacheหมด | ✅ |
| Discord | ~600ms | HTTP → Discord API + Supabase query (sequential) | ✅ |
| Supabase | ~380ms | Real DB query ผ่าน internet | ✅ |
| Stripe | ~380ms | Real API call ไป Stripe (cache 60s แล้ว) | ⚠️ จำกัด |
| Next.js | 0ms | Hardcode — ไม่ได้วัดจริง | ✅ |

---

## 2. Per-Service Fix

### 2.1 SMTP — ~1000ms → ~50ms

**ปัญหา:** `transporter.verify()` ทำ full SMTP handshake (connect → EHLO → AUTH → QUIT) ทุกครั้งที่ verify cache หมด (60s)

**ทางแก้:** เปลี่ยนจาก `verify()` เป็น **TCP connection test** — แค่เปิด socket ไปหา SMTP host:port แล้วปิด ไม่ต้องทำ SMTP handshake

```ts
import net from "net";

async function checkSmtp(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    if (!process.env.SMTP_HOST) throw new Error("SMTP not configured");
    const now = Date.now();
    if (now - smtpVerifiedAt < SMTP_VERIFY_TTL) {
      return { status: "ok", latencyMs: now - start };
    }
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const sock = net.connect(Number(process.env.SMTP_PORT) || 587, process.env.SMTP_HOST!);
        sock.once("connect", () => { sock.end(); resolve(); });
        sock.once("error", reject);
        sock.setTimeout(3000, () => { sock.destroy(); reject(new Error("SMTP TCP timeout")); });
      }),
      3_000,
      "SMTP TCP timeout",
    );
    smtpVerifiedAt = now;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err);
  }
}
```

**ผลลัพธ์:** TCP connect ~10-50ms (แทน 1000ms handshake)

---

### 2.2 Discord — ~600ms → ~200ms

**ปัญหา:** 2 operations ทำ sequential:
1. HTTP → Discord API (`/users/@me`)
2. Supabase query (`bot_heartbeats`)

**ทางแก้:** ทำพร้อมกันด้วย `Promise.all`

```ts
async function checkDiscord(db: SupabaseClient<any>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) throw new Error("Bot token not configured");

    const [discordRes, hb] = await Promise.all([
      // 1. Discord API
      fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${token}` },
        signal: AbortSignal.timeout(5_000),
      }).then((r) => {
        if (!r.ok) throw new Error(`Discord API ${r.status}`);
        return r;
      }),
      // 2. Heartbeat query
      db.from("bot_heartbeats").select("last_seen").eq("service", "discord").single(),
    ]);

    if (hb.error || !hb.data) {
      return { status: "degraded", latencyMs: Date.now() - start, message: "Bot heartbeat not found" };
    }
    const lastSeen = new Date(hb.data.last_seen).getTime();
    if (Date.now() - lastSeen > BOT_HEARTBEAT_THRESHOLD_MS) {
      return { status: "degraded", latencyMs: Date.now() - start, message: `Bot last seen ${Math.round((Date.now() - lastSeen) / 3_600_000)}h ago` };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err);
  }
}
```

**ผลลัพธ์:** max(Discord API, Supabase) ~200ms (แทน 600ms sequential)

---

### 2.3 Supabase — ~380ms → ~150ms

**ปัญหา:** `db.from("users").select("id").limit(1)` — query ไป table ใหญ่ผ่าน internet

**ทางแก้:** เปลี่ยนเป็น query ที่เบากว่า — ใช้ `health_checks` (table เล็กกว่า + index อยู่แล้ว) หรือใช้ RPC `SELECT 1`

```ts
async function checkSupabase(db: SupabaseClient<any>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    // ใช้ health_checks แทน users — table เล็กกว่า + index อยู่แล้ว
    const { error } = await withTimeout(
      db.from("health_checks").select("id").limit(1),
      3_000,
      "Supabase timeout",
    );
    if (error) throw error;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err);
  }
}
```

**ผลลัพธ์:** ~150ms (แทน 380ms)

---

### 2.4 Stripe — ~380ms → ~380mm (ยอมรับ)

**ปัญหา:** `stripe.balance.retrieve()` — real API call ไป Stripe

**ทางแก้:** ไม่มีทางลดได้มากกว่านี้ — เป็น external API latency จริง. Cache 60s ช่วยลด frequency แล้ว

**ทางเลือก (ถ้าอยากลด):**
- เปลี่ยนเป็น Stripe API endpoint ที่เบากว่า (เช่น `stripe.account.retrieve()`)
- หรือยอมรับ 380ms เป็น "real latency" — ไม่ใช่ปัญหา

**แนะนำ:** ยอมรับ — 380ms เป็น latency จริงของ Stripe API

---

### 2.5 Next.js — 0ms → ~10ms

**ปัญหา:** Hardcode `{ status: "ok", latencyMs: 0 }`

**ทางแก้:** สร้าง `/api/health` (เบา ๆ) แล้วยิง self-request

**Step 1:** สร้าง `src/app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, uptime: process.uptime() });
}
```

**Step 2:** แก้ `checkNextjs()` ใน `api/status/route.ts`:
```ts
async function checkNextjs(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) throw new Error(`Health endpoint ${res.status}`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return fail(start, err);
  }
}
```

**ผลลัพธ์:** ~5-15ms (real round-trip ภายใน server)

---

## 3. Summary

| Service | Before | After | Improvement |
|---------|--------|-------|-------------|
| SMTP | ~1000ms | ~50ms | 20x |
| Discord | ~600ms | ~200ms | 3x |
| Supabase | ~380ms | ~150ms | 2.5x |
| Stripe | ~380ms | ~380ms | — (ยอมรับ) |
| Next.js | 0ms | ~10ms | real measurement |

**Total check time:** ~2400ms → ~800ms (3x faster)

---

## 4. Implementation Order

1. **Next.js self-request** — สร้าง `/api/health` + แก้ `checkNextjs()`
2. **SMTP TCP test** — เปลี่ยน `verify()` เป็น TCP connect
3. **Discord parallel** — `Promise.all` สำหรับ API + heartbeat
4. **Supabase lighter query** — ใช้ `health_checks` แทน `users`

---

## 5. Files to Modify

| File | Change |
|------|--------|
| `src/app/api/health/route.ts` | สร้างใหม่ — lightweight health endpoint |
| `src/app/api/status/route.ts` | แก้ `checkNextjs()`, `checkSmtp()`, `checkDiscord()`, `checkSupabase()` |
