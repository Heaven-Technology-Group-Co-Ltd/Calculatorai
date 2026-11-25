---
tags: [session, auth, security, backend]
date: 2026-09-28
---

# Session: Admin Gate Consolidation (Candidate 3)

**Duration / scope:** executed the admin-gate plan end-to-end; final two-axis review and fix pass

## What changed
- One fail-closed gate `src/lib/admin/admin-gate.ts` (401/403/429/503 contract, parallel revocation + user read, secure-cookie fallback); `requireAdmin` and `admin-check` are now thin adapters over it; 24 API routes map gate failures through `adminGateErrorResponse`
- Rate limiter split: `checkRateLimit` stays fail-open for non-admin callers; `checkRateLimitStrict` throws so admin paths fail closed with 503
- Dashboard gate moved to `src/proxy.ts` (a page can't return `NextResponse`); role hierarchy removed from `DashboardProvider`/`DashboardClient`; deleted `src/lib/auth.ts`, `useDashboardAuth`, `DashboardGuard`
- Vitest 5.0.2 added (`vitest.config.mjs` — root has no `type: module`); 27 tests pin the security policy
- Review fixes: `PGRST116` no-row user lookup now returns 401 (was 503); zero unjustified `any` in new tests

## What's next
- Unblock `pnpm build`: `.next/build` is root-owned from a prior root run — `sudo rm -rf .next/build` (or `sudo chown -R dev:dev .next`)
- Keep the dirty tree uncommitted; when committing, separate this admin-gate change from the pre-existing dashboard UI restructure / locale / formula-catalog work

## Anything to remember
- Subagent model on this router: only `Claude_free_02` resolves (`claude-sonnet-5`, `claude_free_01`, haiku/opus names all 404); the worktree-isolated review agent sees a clean checkout, so diff-based reviews must run in place
- `users` `.single()` returns `PGRST116` when the row is absent — that's "user deleted → 401", not "DB down → 503"; the revocation store already handled the same code
- Build failures here are usually an ownership issue, not a code issue: check `stat .next/build` before assuming a real defect
