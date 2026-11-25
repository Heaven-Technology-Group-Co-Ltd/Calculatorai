---
tags: [session, auth, splashgate, session-timeout]
status: active
date: 2026-07-23
---

# 📝 Session: SplashGate Auth Redirect & 30-Min Session Timeout

> **Goal:** อัปเดต SplashGate หน้ารับโหลดเมื่อกด EXPLORE ให้ส่งไป Login หากยังไม่ล็อกอิน แต่ถ้าล็อกอินแล้วให้เข้าใช้งานเว็บได้ทันที พร้อมปรับตั้งค่า Session Timeout ไว้ที่ 30 นาที

---

## 🎯 Changes Made

### 1. SplashGate Check Session Status
- **File:** `src/components/SplashGate.tsx`
- **Logic:**
  - เพิ่มการดึงสถานะผู้ใช้ด้วย `useSession()` จาก `next-auth/react`
  - เมื่อผู้ใช้กดปุ่ม **EXPLORE / สำรวจสูตร** บนหน้า LoadingScreen:
    - บันทึก `sessionStorage.setItem("splash_seen", "1")`
    - ซ่อนหน้า LoadingScreen (`setShowSplash(false)`)
    - เช็ก `status`:
      - หาก `status !== "authenticated"` → นำทางไปหน้า `/login` ผ่าน `router.push('/login')`
      - หาก `status === "authenticated"` → แสดงเนื้อหาเว็บหลักตามปกติ (ไม่ต้อง Redirect ไป Login)

### 2. Session & JWT Timeout Capped at 30 Minutes
- **File:** `src/lib/auth-options.ts`
- **Logic:**
  - กำหนดค่า `session.maxAge` และ `jwt.maxAge` ใน `authOptions` เป็น `30 * 60` (1,800 วินาที = 30 นาที)
  - ปรับลดจากเดิม (1 ชั่วโมง) เพื่อเพิ่มความปลอดภัยและรองรับโจทย์ที่ต้องการหมดอายุเมื่อไม่มีกิจกรรมประมาณ 30 นาที

---

## 🧪 Verification & Build

- **Type Check:** รัน `npx tsc --noEmit` ผ่านเรียบร้อย (0 errors)
- **Log.txt:** เพิ่มบันทึก session entry ใน `Log.txt` เรียบร้อย

---

## 🔗 Related Notes
- [[Project-Brain-Map]]
- [[02-Architecture/backend-api-schema]]
- [[01-Decisions/2026-07-22--login-page]]
