## WEB-HC-FIX1 — health check & observability closure

Closes the ten findings (`F-01`..`F-10`) from the 2026-11-25 production audit. Spec: `docs/web-phase-hc-fix1-closure-spec.md`. Implementation report: `reports/web-phase-hc-fix1-luna-report.md`.

**The symptom being fixed.** `https://calculatorai.click/status` reported `degraded` with 24 h uptime 58.7% while Supabase (314 ms), Stripe (142 ms) and SMTP (19 ms) were all `ok`. Two checkers were failing on their own bugs, so the page invented one incident per hour.

### Changes

- **`nextjs` check no longer calls itself over HTTP.** `checkNextjs` used `process.env.NEXT_PUBLIC_URL` (the rest of `src/` uses `NEXT_PUBLIC_APP_URL`), fell back to `localhost:3000` inside a serverless function, and reported "Health endpoint unreachable" at 2 ms. It now calls `getRuntimeHealth()` in process (`src/lib/runtime-health.ts`, shared with `/api/health`).
- **`discord` check reads `bot_heartbeats`, not the web env.** The bot is a separate Gateway process holding its own token; the web app has no business probing Discord. Fresh ≤ 2 h → `ok`, stale → `error "Bot last seen Nh ago"`, no row → `error "No bot heartbeat recorded"`.
- **`/api/status` amplification guard.** 30 s in-process payload cache plus a per-IP 30 req/60 s window returning `429` + `Retry-After` before any upstream probe. `health_checks` writes drop from one per page view to one per cache window, which also stops the uptime panels inflating incidents.
- **Unknown API paths answer JSON.** `src/app/api/[...path]/route.ts` returns `404 {"error":"Not found"}` for every method instead of the 9351-byte HTML page, so `res.json()` callers stop throwing.
- **IaC pinned.** `poweredByHeader: false`, `.nvmrc` = 24, `engines` node >=24 <25 / pnpm >=11, `netlify.toml` `NODE_VERSION = "24"`. The existing Netlify build command is untouched.
- **Six `react-hooks/set-state-in-effect` errors cleared, zero suppressions.** `StatusClient`, `InvoiceTable`, `RefundTable`, `UserDetailModal` move to SWR (already a dependency and already the dashboard pattern); `InfoModal` derives the device tab from a `useSyncExternalStore` media query; `LanguageContext` becomes an external store with a fixed `"en"` server snapshot, so no hydration mismatch.

### Verification (all at `710591e`)

| Gate | Exit | Result |
|---|---|---|
| `pnpm type-check` | 0 | 0 errors |
| `pnpm lint` | 0 | 0 errors, 15 warnings (baseline 6 errors) |
| `pnpm test` | 0 | 21 files / 100 tests (baseline 19 / 87) |
| `pnpm build` | 0 | `/api/[...path]` in route manifest, 16 prerendered routes unchanged |
| `discord-bot` tsc | 0 | 0 errors |

Local `next start` smoke: `/api/health` 200, `/api/does-not-exist` → `404 application/json`, `/api/auth/session` and `/api/users/[id]` still win over the catch-all, POST `/api/users/xyz/deeper` from `evil.example` → `403 CSRF validation failed`, `X-Powered-By` gone, CSP / `X-Frame-Options` / HSTS intact.

Frozen scope: `git diff d2b754b..HEAD -- discord-bot/ src/lib/auth-options.ts supabase/migrations/` → 0 files. No `eslint-disable` / `@ts-ignore` added anywhere.

### Deploy notes

- Environment unchanged. No new env var is required, and `DISCORD_BOT_TOKEN` must **not** be added to the web env.
- One contract deviation, stated on purpose: the aggregate `status` literal stays `"operational"` (per `src/app/status/types.ts:23`), not `"ok"`.
- After deploy, run the ten smoke checks in §5 of the implementation report. The decisive one is comparing `bot_heartbeats.last_seen` against what `/api/status` reports.
