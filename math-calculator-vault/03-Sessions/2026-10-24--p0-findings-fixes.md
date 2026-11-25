---
tags: [session, a11y, p0-fix, branch]
date: 2026-10-24
branch: fix/p0-findings
commit: e092c4f
---

# Session: ปิด P0 Findings ทั้ง 6 จุด (WCAG AA Contrast, Dialog Semantics, Lang Sync, Auth Labels)

**Duration / scope:** แก้ไข 6 ปัญหา P0 ตามรายงาน `UI-UX-AUDIT.html` บน branch แยก `fix/p0-findings`

## What changed
- **P0-1 Contrast `--text-dim`**: ปรับ alpha `0.18` เป็น `0.62` ใน `src/app/globals.css` (contrast บน `--bg` เพิ่มจาก 1.67:1 เป็น 5.27:1 ผ่านเกณฑ์ AA)
- **P0-2 Active Buttons Text**: เปลี่ยน `color: #fff` เป็น `color: var(--bg)` บน `.level-tab-item.active`, `.m-info-btn`, `.lang-btn.active`, `.auth-btn` (contrast เพิ่มจาก 1.79:1 เป็น 7.65:1)
- **P0-3 Dialog Semantics & Focus Trap**: เพิ่ม `role="dialog"`, `aria-modal="true"`, Tab focus trap และ Escape key handling ให้กับ Modal ทั้ง 8 ตัว:
  - ฝั่ง User: `InfoModal.tsx`, `ConfirmModal.tsx`, `HistorySidebar.tsx`, `Sidebar.tsx` (Profile & SignOut modal)
  - ฝั่ง Dashboard: `UserDetailModal.tsx`, `BanConfirmModal.tsx`, `MessageModal.tsx`, `PlanChangeModal.tsx`
- **P0-4 Sync `documentElement.lang`**: เพิ่ม `useEffect` ซิงค์ภาษาลง `<html lang>` ใน `src/lib/LanguageContext.tsx`
- **P0-5 Auth Toggle Labels**: เพิ่ม `aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}` และ `aria-pressed={show}` ใน `LoginClient.tsx`, `SignUpClient.tsx`, `ResetPasswordClient.tsx`, `VerifyClient.tsx`
- **P0-6 Error Color**: เปลี่ยน `#ef4444` เป็น `#FF8A8A` ใน `.confirm-icon`, `.confirm-btn-p`, `.auth-error` (contrast บน `--bg` เพิ่มเป็น 6.04:1)

## Verification
- `npx vitest run`: 30 files / 135 tests passed
- `npx tsc --noEmit`: 0 errors
- `npm run build`: 0 errors
- `scripts/a11y_audit.py`: `roleDialog: 10`, `ariaLabel: 40`

## What's next
- Phase 2: Token consolidation, ลบ Dead CSS (41% global, 22% module), ปลดระวางสีชมพู `#FF2F92`
- Merge branch `fix/p0-findings` เข้า master
