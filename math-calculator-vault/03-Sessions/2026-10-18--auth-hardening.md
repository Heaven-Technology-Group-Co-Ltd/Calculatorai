---
date: 2026-10-18
type: session
tags: [auth, enumeration, email-verification]
---

# 2026-10-18 — Auth hardening (email verification enforcement + anti-enumeration)

## Fixed
1. **Credentials login required verified email** — `authorize()` now returns null for NULL `email_verified`. Google OAuth unaffected (provider supplies `emailVerified`; never reaches authorize). NOTE: accounts predating this (incl. seed-admin) have NULL — they must verify once.
2. **Register stopped enumerating accounts** — always `{success:true, message:"Verification email sent"}`; unverified duplicates get fresh token + resend (also useful: lost verification mail retry); verified duplicates get silence. Residual tell accepted: no mail arrives for active addresses.
3. **Bonus** — user-supplied name was interpolated raw into verification email HTML (phishing vector) → escaped.

## Gates
tsc 0 · vitest 46/46 · scoped eslint 0. Runtime login/registration flows unverifiable without real Supabase.

## Remaining backlog (after this)
PostgREST `.or()` injection hardening (users search), webhook SSRF allowlist, status uptime cron writer (deploy target decision), Sidebar clipping under isTablet flip, token-scoped consume deletes.
