# WEB-ARCH-5A Rev2 implementation report

- Base: `82bff566374e4537af72f9173a379ebbc655a8c1` (merged PR #5).
- Implementation commit: `a929e2beb1ea945793a85e4aad61fd98aeafa01a`.
- Scope: 32 admin handler prologues across 23 route files now use `withAdmin`; the impersonation restore route and bot-HMAC control endpoint retain their dedicated authorization paths.
- Security: administrative mutations use the authenticated actor and write-ahead audit; guards run before audit for ban and update. Ban/unban explicitly select safe user columns. Recovery limit failures return 503. Existing production rate-limit key prefixes and fail-open/strict modes remain unchanged.
- Vocabulary: shared plan/filter/password/field limits and explicit user projections; the client filter wiring remains a Phase 5B task.
- Compatibility decisions for review: checkout throttling retains its existing HTTP 400 response and forgot-password account throttling retains generic HTTP 200. The existing invalid-user-filter response remains HTTP 500. `ApiError` responses add a `code` field, and ban/unban omit password hashes; these are deliberate exceptions to byte-for-byte response identity in service of the explicit error and security requirements.
- Production migration `010` was confirmed by the user. The SQL read-only checks, authenticated dashboard/self-ban smoke tests, and signup browser smoke were not independently run in this environment; do not treat them as passed.
- Verification: `pnpm type-check` PASS; `pnpm lint` PASS (0 errors, 7 existing warnings); `pnpm test` PASS (47 suites, 194 tests); Discord bot `tsc --noEmit` PASS; `pnpm build` PASS; `python scripts/v3/measure.py` PASS (G11=0, non-global CSS raw hex=0). No migration changes or new suppression directives.
- Remaining review: independent DeepSeek sign-off and GitHub/Netlify checks on the draft PR. Write-ahead audit compensation is best-effort; outbound webhook effects cannot be rolled back after delivery.
