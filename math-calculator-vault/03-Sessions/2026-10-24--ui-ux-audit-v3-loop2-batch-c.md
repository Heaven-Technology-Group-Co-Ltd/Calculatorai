# UI/UX Audit v3 — Fix Loop #2, Batch C (P1 a11y/i18n)

**Date:** 2026-10-24 · **Branch:** `fix/audit-v3-C-glm` (from `fix/ui-ux-audit-v3` @ 19765c8) · **Model:** GLM (Loop #2)

## What happened

Second fix loop on the v3 audit. First verified Loop #1's claims independently
(mutation-tested G8–G12, re-ran measure.py), then closed all 7 batch-C findings,
each with its own commit and browser verification where reachable.

## Findings closed

- F-08 MotionConfig reducedMotion="user" at root layout (3ff1dfa)
- F-23 SignUp input focus ring restored (7118a4c)
- F-06 accessible names on 14 form controls (c16146f)
- F-17 role=alert/status + single LiveRegion for status auto-refresh (954d511)
- F-18 BCP-47 document.lang mapping jp→ja, ch→zh; dashboard reads LanguageContext (9ba0274)
- F-20 reset-password uses LanguageContext, 6 missing keys filled ×5 languages (35e05c9)
- F-15 marketing numbers read registry/math-data/package.json/MAX_HISTORY (b123472)

## Handoff findings on Loop #1 (fixed first)

- G8 didn't catch raw rgb()/rgba() in module CSS → ratchet baseline 203, down-only (a3e110b)
- G11 didn't scan globals.css → extended + purged dead `.dashboard-shell`/`.footer` (9f1631c)
- New regression the audit missed: `.m-info-container { display: flex }` overrode
  UA `dialog:not([open]) { display: none }` — the closed InfoModal kept covering the
  page and swallowing clicks while `dialog[open]` counted 0 (f1548e4)

## Left open (deliberate)

- F-02 checkout not browser-walkable here (no `.env.local`, no Stripe keys)
- reset-password subtitle "Enter your new password" still hardcoded EN
- G8 doesn't scan hex in src/components/*.tsx yet (15 files need migration first)
- LanguageDropdown conflates locale codes with country/flag codes

## Decisions

- Ratchet pattern adopted for raw rgb()/rgba() debt instead of a big-bang migration.
- document.lang BCP-47 mapping lives only at the sync layer; internal Lang keys
  (th|en|jp|ch|ko) stay untouched by design.
