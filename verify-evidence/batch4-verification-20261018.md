# Batch 4 verification — 2026-10-18

## RED (before fixes, live drive)
Click "ล้างทั้งหมด" in history drawer → sessionStorage math_calc_history_v3 instantly "[]", NO confirmation dialog. (observed)

## GREEN (after fixes, live drive, fresh app)
- Click Clear All → ConfirmModal "This action cannot be undone" appears; sessionStorage history INTACT.
- Confirm in modal → sessionStorage "[]", modal closes.
- /api/status checks[] now static service messages ("Database connection failed", "Stripe API unreachable", "SMTP not configured", "Bot token not configured") — no upstream err strings; env-less error path returns generic {"error":"Internal server error"} (was "SUPABASE_URL is not set").

## Gates
tsc 0 · vitest 9 files / 46 tests (incl. 4 client-ip tests: rightmost-XFF-hop, single-hop, x-real-ip fallback, unknown) · scoped eslint 0 errors on touched files.

## Scope shipped
- M: 32 error-message leak sites across 23 API files → generic serverErrorResponse; status checks → static strings.
- X: new src/lib/client-ip.ts (rightmost XFF hop, ponytail ceiling documented), getClientIp wrapper, 6 route sites migrated.
- R: Clear-All confirm wiring (AppShell openConfirm), restoration map cleared, FormulaCard restore-sync effect, delete rollback, pagehide/visibilitychange flush, randomUUID fallback.

## IAB test-env notes (not app bugs)
Long-lived tab + repeated HMR wedged React events / clipped drawer container (elementFromPoint hit HistorySidebar clearBtn while innerText hid it — drawer clipping rendering quirk under isTablet state); fresh tab + resize dispatch recovered. Worth a future look: HistorySidebar container clipping when isTablet flips mid-session.
