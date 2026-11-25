---
tags: [session, design-system, consolidation, tokens]
date: 2026-10-24
branch: refactor/design-system-consolidation
commit: af9001f
---

# Session: Phase 2 Design System Consolidation (รวม Token & เคลียร์หนี้ดีไซน์)

**Scope:** Unify design tokens on globals.css, delete dead code & duplicate token files, enforce strict icon typing, migrate fonts to next/font, standardize type scale & z-index, and clear all out-of-system hex colors.

## Summary of Completed Work
1. **Unify Design Tokens & Single Source of Truth:**
   - `globals.css` เป็น Single Source of Truth สำหรับ tokens ทั้งระบบ (Colors, Status, Type Scale, Z-Index, Spacing, Radius, Semantic Aliases).
   - ลบทิ้ง `src/lib/design-tokens.ts` (129 บรรทัดที่ซ้ำซ้อน) และอัปเดต `PurchaseClient.tsx` ให้อ่าน CSS variables โดยตรง.
   - จัดการ Level Colors ให้ยึดจาก `src/lib/math-data.ts` เป็นมาตรฐานเดียว (elementary: #4ade80, middleSchool: #facc15, highSchool: #fb923c, university: #ef4444).
2. **Type Scale & Z-Index Standardization:**
   - Type Scale 6 ขั้น: `--fs-1: 12px` ถึง `--fs-6: 27px` ใน `:root`.
   - Z-Index 5 ชั้นมาตรฐาน: Base (0), Sticky (10), Drawer (40), Modal (50), Toast (60) — ยุบค่ากระโดดเดิม 10000, 3000, 2500, 1000 ลงมาทั้งหมด.
3. **Dead CSS & Legacy Code Elimination:**
   - ลบ Dead Global classes 59 รายการ (จาก 75 เหลือ 16 ซึ่งเป็น active dynamic classes ใน JSX ทั้งหมด).
   - ลบ Dead Module classes 85 รายการ (จาก 107 เหลือ 19).
   - ลบไฟล์ตาย `src/app/page.module.css` (boilerplate ที่ไม่ได้ถูกเรียก).
   - กวาดล้างสีชมพูธีมเก่า `#FF2F92` ออกครบทั้ง 7 จุดในโค้ด แทนที่ด้วย `var(--primary)` / token.
4. **Font Optimization:**
   - ลบ `@import` Google Fonts render-blocking ออกจาก `globals.css`.
   - ย้ายการโหลด Inter, Outfit, JetBrains_Mono มาใช้ผ่าน `next/font/google` ใน `src/app/layout.tsx` พร้อมผูก CSS variables `--font-inter`, `--font-outfit`, `--font-jetbrains-mono`.
5. **Color Drift Cleanup:**
   - กวาดล้างครีม `#F5EDE0` และเทา `#B8B0A8` ออกจาก Auth, Dashboard, และ Status ทั้งหมด แทนที่ด้วย `var(--text)` และ `var(--text-secondary)`.
   - แปลง hardcoded hex ใน CSS modules ทั้งหมดเป็น CSS variables ส่งผลให้ non-globals.css hex hits ลดลงจาก 276 จุดเหลือ **0 จุด** (ผ่าน Gate G8 100%).
6. **Strict Type Safety:**
   - เปลี่ยน `icon: string` (fa-* dummy) ใน `LevelSection`, `Department`, `PaymentPackage`, `GuideStep` เป็น `icon: LucideIcon` จาก lucide-react.
   - อัปเดต `Sidebar.tsx`, `LevelFilter.tsx`, `LevelTabs.tsx`, `InfoModal.tsx` ให้ render ไอคอนจาก data model โดยตรง ไม่ต้องพึ่ง string lookup map.
7. **Automated Quality Gates:**
   - เพิ่ม test suite `src/lib/design-system-gate.test.ts` ตรวจสอบ Gate G8, G10, Type/Z-index tokens อัตโนมัติใน CI.

## Verification
- `npx vitest run`: 31 test files, 138 passed (100% pass)
- `npx tsc --noEmit`: 0 errors
- `npm run build`: Next.js 16 production build succeeded (34/34 routes)
- `python scripts/audit_ui.py`: Unused global classes 75→16, Unused module classes 107→19 (Gate G11 passed)
- Raw hex in non-globals CSS: 276→0 (Gate G8 passed)
