## Dashboard telemetry and query bounds

Replace dead database-session metrics with page-view telemetry, populate sanitized referrer and CDN country, batch dashboard queries, bound analytics scans, and fix percentage rounding. Harden history IDs, expanded Stripe refund IDs, refund clock skew, and impersonation exit errors. No SQL migrations.

**Draft — sign-off blocked:** sampled breakdowns and daily counts can undercount at the Supabase row cap; `formula_usage` has no identified client writer or shared session identifier; `last_active_at` is not populated or merged. See the implementation report for details. Exact traffic and seven-day page-view totals use head counts.

## Verification

All six gates passed: type-check, lint (0 errors, 15 existing warnings), 138 tests, Discord bot type-check, build, and `scripts/v3/measure.py`.

## Post-deploy smoke checks

Check session deduplication, device percentages, external versus self-referrals, CDN country, dashboard totals versus database counts, and test-mode refunds. Verify calculation instrumentation before trusting conversion.
