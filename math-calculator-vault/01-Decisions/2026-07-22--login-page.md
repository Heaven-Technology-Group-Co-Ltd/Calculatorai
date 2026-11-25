---
tags: [decision]
status: active
date: 2026-07-22
---

# Decision: Login Page — Calculator Display Strip with "ACCESS:" Prompt

## Context
User asked to create a proper Login page (previous `src/app/login/page.tsx` was just `redirect("/")` — no UI, no form, no design). Requested to follow same quality level as the recently completed SignUp and Verify pages: responsive, animated, 5-language.

ที่มีอยู่: `AuthButton.tsx` handles sign in/out via next-auth, `AuthGuard.tsx` redirects unauthenticated users to `/login`, but `/login` itself didn't exist as a page.

จำเป็นต้องสร้าง Login page ที่:
- มี identity เชื่อมโยงกับ Premium Math Calculator (ไม่ใช่ generic form)
- Responsive 4 breakpoint จริง (901+, 900, 640, 400)
- Mobile-first CSS
- 5 ภาษา (th/en/jp/ch/ko)
- Animation (Framer Motion staggered entrance)
- รองรับทั้ง Credentials (email/password) และ Google OAuth

## Decision
1. **ใช้ Calculator display strip** — แถบจอมืดด้านบนแสดง "ACCESS:" (monospace, dimmed) พร้อม blinking cursor เป็น signature element แตกต่างจาก 404 page ที่ใช้ "400 + 4 =" เพราะ login เป็นสถานะ "รอ input" ไม่ใช่ error
2. **"=" key submit button** — ปุ่ม Sign In ใช้ primary color #E8B896 เหมือนปุ่ม "คำนวณ" บนเครื่องคิดเลข มี hover glow effect
3. **Staggered entrance animation** — 7 ขั้นตอน: error message → email → password → submit button → divider → Google button → footer link ระยะห่าง delay ละ 0.1s
4. **Standalone ไม่ใช้ AppShell** — เหมือน SignUp/Verify เพราะเป็น auth page แยกจาก main app flow
5. **4-breakpoint responsive** — mobile-first, bottom nav clearance 80px สำหรับ ≤640px, touch targets ≥44px
6. **Error states** — แยก `loginErrorRequired` (กรอกไม่ครบ) และ `loginErrorFailed` (ข้อมูลไม่ถูก) แสดงเป็น red box พร้อม icon

## Alternatives Considered
- **ใช้รูปแบบเดียวกับ 404 display** — rejected: "400 + 4 = 404" concept ไม่เหมาะสมกับหน้า login, login ควรสื่อถึง "กำลังรอ input" ไม่ใช่ error
- **ไม่มี display strip, card ตรงๆ** — rejected: จะกลายเป็น form ทั่วไป ไม่มี visual identity เชื่อมโยงกับ math calculator subject
- **ใช้ตาราง matrix-style** — rejected: ดู technical เกินไป, ไม่ตรง Premium positioning
- **ใส่รุป avatar/profile ตอนยังไม่ login** — rejected: สร้างความสับสน, user ยังไม่มี profile จนกว่าจะ login เสร็จ

## Consequences
- **ง่ายขึ้น**: Login มี identity ชัดเจนด้วย calculator display strip, pattern เดียวกับ SignUp/Verify layout
- **ง่ายขึ้น**: Reuse รูปแบบ animation และ responsive system จาก SignUp/Verify ทำให้ consistency
- **ยากขึ้น**: ถ้ามีการเปลี่ยน auth provider หรือเพิ่ม social login options ต้องขยาย UI component
- **ต้อง revisit**: ถ้ามี Forgot Password หรือ Multi-factor Authentication ต้องตัดสินใจว่าจะเป็น popup modal แยก หรือเพิ่มใน flow นี้

## Related
- [[ursa-palette-redesign]] — Ursa tokens (primary #E8B896, surface #2F3D44, text #E8DCC8, border #3D4F57)
- [[purchase-page-responsive]] / [[dashboard-responsive-redesign]] — 4-breakpoint responsive system เดียวกัน
- [[404-not-found-page]] — calculator display concept ต่างกัน (404 = "400+4=", login = "ACCESS:")
- [[signup-status-check]] — SignUpClient pattern ที่ใช้เป็น reference
