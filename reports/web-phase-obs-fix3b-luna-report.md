# WEB-OBS-FIX3B implementation report

## 1. Metadata and draft status

Baseline: `18f470f541397bf34f90e3f15dd9b9bf08840b66`; branch: `fix/web-obs-fix3b`. The commit containing this report is the implementation anchor (a commit cannot contain its own SHA). No migration files are modified. This is a draft for independent review; see the PR for its current commit and diff.

## 2. Schema and contracts

`page_views` has required `path` and `created_at`; `session_id`, `user_agent`, `referrer`, `country`, and `user_id` are nullable. `users.last_active_at` is nullable; no updater was found in `src/`. The generated Functions block contains health functions, not an analytics aggregation RPC. The client previously sent null session IDs while the route rejected null. It now creates an anonymous per-tab identifier and accepts null from older callers. User detail keeps `recentSessions` as an empty array because JWT activity cannot be attributed to a user from the existing tracker; no expiration dates are fabricated.

## 3. Resolution and remaining limitations

- OBS-01: schema and consumers inspected.
- OBS-02: stats, sessions analytics, and report use page views instead of database sessions; anonymous rows count individually. Activity based on `last_active_at` is not merged because it is not populated and cannot be deduplicated with anonymous page views.
- OBS-03: referrer stripped of query/fragment and self-referrals filtered; country resolved from CDN headers.
- OBS-04: stats queries execute in one parallel batch; largest-remainder percentages and explicit history projection added. Traffic has an exact total and capped samples; report and session scans are capped.
- OBS-05: crypto fallback, expanded payment intent, 60-second skew tolerance, and impersonation error handling added.
- OBS-06: tests cover rounding, tracker headers/referrers, bounded traffic and sessions, batched stats, and expanded refund under clock skew.
- OBS-07: draft PR only.

**Review limitations:** Supabase's deployment row limit may be below the requested 10,000. Daily charts, online visitors, device shares, session and traffic breakdowns are sampled and can undercount when the cap is reached; only total page views uses an exact count. No `formula_usage` writer was found in `src/`, and its session identifiers are not linked to the new page-view identifier, so conversion and calculations cannot be relied on until instrumentation is connected. These constraints mean the dashboard-truth objective is not fully closed and require independent follow-up before sign-off. `users.last_active_at` is not merged. Line coordinates and diff are available directly from the PR at its current HEAD.

## 4. Verification

All six gates passed: `pnpm type-check`; `pnpm lint` (0 errors, 15 existing warnings); `pnpm test` (33 files, 138 tests); `pnpm --dir discord-bot exec tsc --noEmit`; `pnpm build`; `python scripts/v3/measure.py`. Added test names: `allocates remainders without a negative tablet share`; `returns zero shares when there are no devices`; `prioritizes Netlify country and strips referral secrets`; `reads encoded geo before Cloudflare and rejects self referrals`; `ignores invalid country codes`; `caps the sample and returns an exact total`; `groups bounded page views into live sessions`; `uses one page view range for live visitors and daily devices`. Updated `downgrades users.plan to free and cancels subscription on full refund of sole payment` to exercise an expanded payment intent and two-second skew.

## 5. Post-deploy smoke plan

Visit multiple routes in one browser tab; check one active session, daily views and device share. Check external and internal referrers and country using trusted deployment headers. Verify exact total against database count and compare sample size to the deployment row cap. Test refund and impersonation exit in a safe test environment. Validate formula telemetry before accepting conversion metrics.
