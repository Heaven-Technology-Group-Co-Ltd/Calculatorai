---
type: project
date: 2026-10-24
tags: [ui-ux-audit-v3, batch-e, handoff-audit, a11y, quality-gates]
branch: fix/audit-v3-E-glm
base: fix/audit-v3-D-ds (24dd3e0)
tip: a8994ce
---

# UI/UX Audit v3 — Loop #4 Batch E (ตรวจรับก้อน D + แก้ช่องโหว่ + P2-12..16)

## ผลตรวจรับก้อน D (DeepSeek) — พบช่องโหว่ 4 กลุ่ม
1. **Lint**: D ปล่อย eslint error ใหม่ (react-hooks/immutability ใน PurchaseSuccessClient) — แก้ด้วย named function expression
2. **Overclaim**: อ้างว่า proxy.test.ts ทดสอบ /formulas-demo 404 — ไม่มี test นั้นจริง · อ้าง F-19 "ปิดสนิท" ทั้งที่ flag path พังบน next start (static prerender อบ notFound ตอน build — probe พิสูจน์ว่า proxy เห็น runtime env จริง ต้นตอคือ page)
3. **Regression ที่หลุด**: F-17 announcement masking (finally ทับ catch → refresh ล้มเหลวประกาศว่าสำเร็จ) · F-13 สีข้อความ #9ca3af/#ef4444 ตก WCAG บน card-bg (4.31:1/2.9:1) · F-12 badge "DEPARTMENTS 24" ขัดลิสต์ 12 ปุ่ม
4. **Gate อ่อน**: G11 ฝั่ง global เป็น bare-word (`.session` mutation เขียว) → className corpus · G8 ไม่ครอบ src/app .ts + src/lib (M3 เขียว) → ratchet รายไฟล์ · G12 baseline หลวม 12 จุด → ลดล็อก 304→292

## สิ่งที่ลงตัว
- fix(handoff) ×8: 40618b1 (lint) · 4232d6c (H-7 flag: force-dynamic + gate แยก + test) · 647e9c9 (F-17) · 36da630 (สี+badge: --status-unknown #a8b0bc) · 60c237e (G11) · 98de5d8 (G8) · 5595167 (G9/G12) · 7684c8b (H-5 timing: dummy-hash compare ทั้ง authorize และ register)
- fix(P2) ×5: 9f0332d backdrop native idiom 8 dialogs · ad76a83 language dropdown listbox+arrows+Escape · 7dcec71 tabs→tabpanel+arrow (InfoModal พิสูจน์บนจอ) · 8f7e3c8/bfc9c31 sidebar profile เป็นปุ่มจริง (ถอด nested interactive + Space)

## บทเรียน
- **ตรวจ claim ของ Loop ก่อนเสมอ**: ทั้ง 4 รอบเจอช่องโหว่จริงในงานที่อ้าง "ปิดสนิท" — รอบนี้ overclaim ที่ชัดที่สุดคือ test ที่ไม่มีตัวตน
- **heredoc ยาวใน Git Bash ของเครื่องนี้พัง** (ตัดกลางคำ): เขียนไฟล์ยาวให้ใช้ Write tool + cat append
- **kill %1 ใช้ไม่ได้** ใน shell นี้ — ต้องฆ่าด้วย PID จาก netstat มิฉะนั้น server เก่าตอบแทนแล้วสรุปผลผิด (เกือบสรุปว่า fix ไม่ทำงาน)
- **IAB ส่ง trusted key ไม่สม่ำเสมอ**: cua.keypress ผ่านเมื่อนำด้วย cua.click จริง ไม่ผ่านเมื่อนำด้วย evaluate focus — ใช้ dispatch + defaultPrevented เป็นหลักฐานรอง และติดป้ายตามจริง
- ทุก gate ที่แก้ mutation-tested ก่อนนับเสร็จ (รวม 10 mutation รอบนี้)

## สภาพปลายทาง
tsc 0 · vitest 36/160 · build 0 · eslint 20e/97w (ลดจาก 21e) · measure deterministic (b6846a45…) · hex js/ts 89 (จาก 97) · G11=0 แบบเข้ม · ยังไม่ยืนยันบนเบราว์เซอร์: Stripe walk, dashboard ฝั่ง login, StatusClient tabs (ต้อง DB)
