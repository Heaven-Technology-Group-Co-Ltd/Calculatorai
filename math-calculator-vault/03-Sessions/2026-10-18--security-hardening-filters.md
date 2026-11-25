---
date: 2026-10-18
type: session
tags: [security, postgrest-injection, ssrf, webhooks]
---

# 2026-10-18 — Security hardening: filter injection + SSRF allowlist + token scoping

## Fixed
1. **PostgREST filter injection** — `users` GET interpolated raw `search` into `.or(name.ilike.%..%,email.ilike.%..%)`; `,`/`(`/`)^ in the term added attacker-chosen OR clauses (e.g. `%,is_admin.eq.true`). Now double-quoted values via `sanitizeSearchTerm` (doubles embedded quotes) — reserved chars become literals.
2. **Webhook SSRF** — `CreateWebhookSchema`/`UpdateWebhookSchema` accepted any URL; test route fetched stored URLs (cloud-metadata/internal liveness oracle). Allowlist: https + discord.com / discordapp.com + `/api/webhooks/` path. Test route re-validates stored URLs (legacy rows) before fetch.
3. **Token consume deletes** — verify/reset now delete by identifier+type+token (a pending resend of the same type is no longer invalidated by redeeming an older token).

## Gates
tsc 0 · vitest 10 files / 51 tests (5 new: sanitize quoting/doubling, allowlist accept/reject) · scoped eslint 0.

## Backlog
22 routes hold `const supabase = getSupabaseAdmin()` at module scope — import-time env throw class; mechanical sweep to move into handlers (next batch). Uptime cron writer (deploy target), Sidebar clipping under isTablet flip.

## Addendum — lazy-init sweep complete (same day)
22 routes moved `getSupabaseAdmin()` from module scope into handlers (31 insertions, 2 helpers self-call). Proof grep zero remaining. Runtime: no-env boot yields handled gate JSON (503 fail-closed) instead of import crash. Commit 63cd275. Remaining backlog is now only deploy-side: uptime cron (target decision), migration 009, bot+server coupled deploy, Sidebar clipping audit.
