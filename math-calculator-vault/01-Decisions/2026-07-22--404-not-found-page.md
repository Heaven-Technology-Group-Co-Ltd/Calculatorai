---
tags: [decision]
status: active
date: 2026-07-22
---

# Decision: 404 Not Found — Calculator-Display Concept with Subject-Bound Visual Identity

## Context
ผู้ใช้ request 404 page ที่ responsive ทุกขนาดหน้าจอ โดยเฉพาะ mobile layout ต้องถูกออกแบบจริงไม่ใช่แค่ย่อ desktop ลงมา

ที่มีอยู่: project ยังไม่มี `not-found.tsx` เลย ใน Next.js App Router ถ้าไม่มีระบบจะแสดง default 404 ที่ plain ไม่มีดีไซน์

จำเป็นต้องสร้าง 404 ที่:
- มี visual identity เชื่อมโยงกับ Premium Math Calculator
- Responsive 4 breakpoint จริง (901+, 900, 640, 400)
- Mobile-first CSS
- 5 ภาษา (th/en/jp/ch/ko)
- Animation เพิ่มประสบการณ์ไม่ใช่แค่ของตกแต่ง

## Decision
1. **ใช้ calculator-display concept** — 404 ถูกนำเสนอเป็น "ผลลัพธ์" ของการคำนวณ "400 + 4 = 404" บนจอ калькуเลเตอร์มืดๆ เลียนแบบเครื่องคิดเลขจริง
   - บรรทัดบน: "400 + 4 =" (monospace, dimmed) — เหมือน user เพิ่งกดเครื่องคิดเลข
   - บรรทัดกลาง: "404" (Outfit 800, primary color #E8B896) — ขนาดใหญ่ เป็นผลลัพธ์
   - บรรทัดล่าง: "ERR: UNDEFINED" (monospace, error color) — calculator error state
2. **∉ domain pun** — "This page is ∉ our domain" ใช้สัญลักษณ์ทางคณิตศาสตร์ (not an element of / not in domain) สื่อว่าหน้านี้ไม่มีอยู่ใน domain ของเรา เป็น math joke ที่เชื่อมโยงกับ subject
3. **Staggered entrance animation** — Framer Motion เรียงลำดับ: calc line → 404 (spring effect) → ERR tag → domain tag → description → CTA button ระยะห่าง delay ละ ~0.12s
4. **Standalone ไม่ใช้ AppShell** — 404 ไม่มี sidebar/navbar เพราะเป็นหน้าสถานะ error แยกจาก main app flow
5. **Decorative ∅ backdrop** — สัญลักษณ์ empty set ขนาด 40vw opacity 0.025 เป็นพื้นหลังเสริม calculator theme
6. **4-breakpoint responsive** — mobile-first, bottom nav clearance 80px สำหรับ ≤640px

## Alternatives Considered
- **Generic illustration 404** — rejected: ไม่เชื่อมโยงกับ math calculator subject, รู้สึก templated
- **Animated glitch effect** — rejected: เสี่ยง视觉 overload, mobile performance, อาจ distract จาก core message
- **Minimal text-only** — rejected: ขาด visual identity, ไม่ตรงตาม design principle ที่ให้หา signature element
- **ใช้ game-style "level not found"** — rejected: ไม่ตรงกับ Premium positioning
- **404 image/graphic** — rejected: เพิ่ม bundle size, ไม่จำเป็น, แก้ responsive ยาก

## Consequences
- **ง่ายขึ้น**: 404 มี identity ชัดเจน, ต่อยอด pattern calculator-display ไปใช้กับ components อื่นได้ (history, expression preview)
- **ง่ายขึ้น**: Build auto-detect ไม่ต้อง config route เพิ่ม
- **ยากขึ้น**: 404 มี Framer Motion + CSS module = ถ้าต้องแก้ไขต้องเข้าใจทั้ง animation flow และ responsive system
- **ต้อง revisit**: ถ้ามี AppShell-level error boundary หรือ global-error.tsx (500) ควรใช้ visual pattern เดียวกันเพื่อ consistency

## Related
- [[ursa-palette-redesign]] — Ursa tokens (primary, bg, surface, border, font vars)
- [[purchase-page-responsive]] — responsive 4-breakpoint pattern เดียวกัน
- [[signup-status-check]] — session นี้ตรวจสอบ SignUp ก่อนสร้าง 404
