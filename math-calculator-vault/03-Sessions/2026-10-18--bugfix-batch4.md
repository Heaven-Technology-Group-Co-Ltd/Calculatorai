---
date: 2026-10-18
type: session
tags: [bug-fix, security, ux-state, message-leak, xff]
---

# 2026-10-18 — Bug-fix batch 4 (message leaks, XFF identity, UX state x5)

## Fixed
1. **Internal error text leaked to clients** — 32 `serverErrorResponse(err.message)` sites across 23 API files (Supabase/PostgREST strings, table names, "Bot token not configured") → generic messages; details stay in `console.error`. `/api/status` check messages are now static per-service strings; control strings ("Discord responded 503") kept.
2. **Rate-limit identity spoofable** — XFF first hop (client-writable) keyed every limit; new `src/lib/client-ip.ts` anchors the rightmost hop (nearest trusted proxy; ponytail ceiling: N proxies → index length−N). 6 routes + `getClientIp` migrated. 4 unit tests.
3. **UX/state five** — Clear History now opens ConfirmModal (RED runtime repro captured first: instant silent wipe); restoration map cleared with history (deleted inputs no longer resurrect); FormulaCard restore syncs mounted cards; failed DELETE rolls back optimistically; pagehide/visibilitychange flushes the 500ms debounce; `crypto.randomUUID` fallback for plain-HTTP.

## Verification
- Runtime browser drive: RED (instant wipe observed) → GREEN (modal appears, history intact; confirm clears + closes; `math_calc_history_v3` = `[]`).
- Runtime curl: status checks static; env-less path generic 500.
- Gates: tsc 0 · vitest 9 files / 46 tests · scoped eslint clean.
- Evidence: `verify-evidence/batch4-verification-20261018.md`; commit 5308832 (+log/evidence commits).

## Env notes for future sessions
IAB long-lived tab + repeated HMR wedged React events and clipped the HistorySidebar container (elementFromPoint hit its clearBtn while innerText hid it). Environment quirk, but the clipping under isTablet flag-flips is worth a look (matches the earlier sidebar-overlay audit flag).

## Backlog remaining (ranked)
Status uptime cron writer (needs deploy target decision), HistorySidebar clipping/isTablet overlay audit, email-verification enforcement + enumeration leaks (register 409 vs forgot no-enumeration), PostgREST `.or()` injection hardening, webhook settings SSRF allowlist, token-table consume deletes could be token-scoped.
