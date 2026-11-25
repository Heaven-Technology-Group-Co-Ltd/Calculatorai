# Proof run — 2026-10-18 — formula-calculation (Square Area)

Result: **PASS** (with documented env gotcha)

## What ran

1. `pnpm install` (via `corepack pnpm`, pnpm not on PATH directly).
2. Dev server: `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=verify-scaffold-placeholder corepack pnpm dev:web`
   — inline placeholder env required (see gotcha), no `.env` file created.
3. Doctor: `GET /` → 200; `GET /api/health` → `{"ok":true,"uptime":5.3800865}` (api-health.json).
4. Splash → "EXPLORE" → redirected to `/login` (unauthenticated guest).
   Navigated back to `/` (splash_seen=1 now set) → AppShell grid rendered.
5. Card `Square Area — Geometry` clicked → expanded, reveals
   textbox "Side (s)", button "Calculate", button "RESET".
6. Filled Side (s) = 5, clicked Calculate.
7. `.p-result` rendered: `Result25 sq. units`.
8. Side effect: `sessionStorage["math_calc_history_v3"]`
   (square-area-history-sessionstorage.json) — entry with
   `calcId: geo_sq, inputs: {s: "5"}, result: "25", unit: "sq. units"`.
9. Independent check: 5² = 25 ✓ (registry `fn: (v) => v.s ** 2`).
10. Screenshot: square-area-result.png.

## Gotchas discovered (fed back into the skill)

- **Middleware requires Supabase env at startup.** `src/proxy.ts` imports the
  admin gate → `supabase-adapter.ts` reads `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` at module evaluation. Without any value every
  request (including `/`) returns 500 "SUPABASE_URL is not set". Placeholder
  values inline are enough; the DB is never actually reached for public pages.
- **Home page is behind the splash sign-in redirect for first-time visitors:**
  SplashGate's EXPLORE pushes unauthenticated users to `/login`. The calculator
  is reachable by returning to `/` in the same session (`splash_seen`).
- History is sessionStorage (`math_calc_history_v3`) — verified, not localStorage.
- pnpm is available through `corepack pnpm` on this machine (not on PATH).
