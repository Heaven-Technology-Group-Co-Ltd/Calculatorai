---
tags: [session]
date: 2026-07-22
---

# Session: Login Page — calculator display strip with ACCESS prompt

**Duration / scope:** Single-task: create responsive login page with form, Google OAuth, and calculator-themed signature

## What changed
- **Created `src/components/login/LoginClient.tsx`** — client component: email/password form, Google OAuth via next-auth, Framer Motion staggered entrance (7-step: error → email → password → submit → divider → Google → footer), calculator display strip with "ACCESS:" monospace prompt + blinking cursor
- **Created `src/components/login/Login.module.css`** — Ursa palette, calculator display dark panel, "=" key submit button style, 4-breakpoint responsive mobile-first (≥901px / ≤900px / ≤640px / ≤400px), bottom nav clearance, large touch targets
- **Replaced `src/app/login/page.tsx`** — from bare `redirect("/")` to render LoginClient, detected as static route by Next.js
- **Added 12 translation keys** to `uiTranslations` (th/en/jp/ch/ko): `loginTitle`, `loginDisplayPrompt`, `loginEmailLabel`, `loginPasswordLabel`, `loginSubmit`, `loginLoading`, `loginGoogle`, `loginNoAccount`, `loginSignUp`, `loginErrorRequired`, `loginErrorFailed`

## Design decisions
- **Calculator display strip** — dark panel with "ACCESS:" monospace prompt and blinking cursor, ties to math calculator theme uniquely (not same as 404's "400 + 4 =")
- **"=" key submit button** — primary bg #E8B896 with hover glow, styled like calculator "execute" key
- **Standalone layout** — no AppShell/sidebar (same pattern as SignUp/Verify for auth pages)
- **12 translation keys** — covers all UI text, error states, and prompts
- **Build verified** — `next build` compiled successfully, `/login` appears in route manifest

## What's next
- Test login flow end-to-end (credentials + Google OAuth) when backend is live
- Consider if admin login needs separate page or role-based redirect from this page
- Future: add "Forgot Password" link if Credentials provider adds password reset

## Anything to remember
- Login uses `signIn("credentials", { redirect: false })` to handle errors client-side, then `router.push("/")` on success
- Google OAuth uses `signIn("google", { callbackUrl: "/" })` which triggers external redirect
- Error states: `loginErrorRequired` for empty fields, `loginErrorFailed` for invalid credentials — both use same red error box styling
- The calculator display strip pattern (dark panel, monospace prompt, blinking cursor) could be reused for a "waiting for input" state in calculator components
