# Locale System Unification Design

**Status:** Draft for review
**Date:** 2026-09-28
**Scope:** Candidate 2 from the 2026-09-27 architecture review

## Intent and success criteria

Unify the existing locale state for the main calculator, auth/standalone pages, splash screen, and formulas demo. Preserve the five supported locales (`th`, `en`, `jp`, `ch`, `ko`), current visible translations, and tab-session persistence. Remove parallel locale state and old four-locale translation machinery without changing unrelated UI or formula behavior.

Success means one canonical locale type, one UI translation catalog, one root locale provider, one storage key, no page-level storage reads, and all supported locale consumers use the same current value. Server render and hydration must start from the same default locale; saved locale applies after mount. Storage failures must not break rendering or an in-memory language change.

## Current state

- `src/app/layout.tsx` already wraps the tree in `LanguageProvider`.
- `src/lib/LanguageContext.tsx` uses uppercase `TH|EN|CH|JP`, `sessionStorage["language"]`, and `src/lib/translations.ts`.
- `src/lib/translations.ts` contains an old four-locale dictionary. No page reads its strings; formulas-demo only reads its locale state and maps uppercase codes to lowercase.
- `src/components/AppShell.tsx` separately owns lowercase locale state in `sessionStorage["pref-lang"]`.
- Login and SplashGate read the old key; signup, verify, not-found, and purchase read `pref-lang` themselves.
- `src/lib/math-data.ts` owns the currently used five-locale `uiTranslations` catalog alongside department/level data; `src/types/formulas.ts` currently duplicates `Lang` and `Translation` type definitions.

## Design

### Ownership and module boundaries

- Add `src/types/locale.ts` as sole owner of `Lang` (`"th" | "en" | "jp" | "ch" | "ko"`) and `Translation`.
- Move the existing five-locale `uiTranslations` object, preserving keys and text, from `src/lib/math-data.ts` into `src/lib/translations.ts`. This replaces the unused uppercase four-locale table currently in that path. Re-export the moved catalog from `src/lib/math-data.ts` solely for import-path compatibility; delete that compatibility re-export only after all `@/lib/math-data` importers are migrated.
- Update `src/types/formulas.ts` to import `Translation` from `@/types/locale`; remove duplicate locale type declarations. Formula records and their localized content remain in `src/lib/formulas/registry.ts`.
- Keep `src/lib/math-data.ts` focused on `Department`, `LevelSection`, their arrays, and no formula catalogs. UI strings move out of it; its temporary re-export is an explicit migration bridge, not a permanent owner.
- Keep `LanguageProvider` in `src/lib/LanguageContext.tsx`; it remains the sole runtime locale owner and exposes `language: Lang`, `setLanguage(lang)`, and typed `t(key)` backed by `uiTranslations`.
- Preserve existing behavior and copy in migrated consumers, including placeholder text, `verifyGoHome` reuse in signup, hardcoded validation messages, and Purchase's locale-independent Stripe product-name behavior.

### State, persistence, and migration

- Use one key: `pref-lang`, with lowercase supported locale codes. Persistence remains scoped to the current tab via `sessionStorage`.
- On mount, read and validate `pref-lang`. If absent or invalid, accept a valid legacy `language` value (`TH|EN|CH|JP`, including lowercase equivalents and `KO`), normalize it, save it under `pref-lang`, and remove the legacy key. A valid `pref-lang` takes precedence; remove the stale legacy key after a successful read. Otherwise default to `en`.
- Initialize locale to `en` for both server render and hydration; read storage in an effect after hydration to prevent locale-dependent hydration mismatch. A saved non-English locale may replace the initial English content immediately after mount; do not hide the whole application behind a loading gate.
- Wrap reads, writes, and legacy-key removal in exception handling. The provider keeps state updates working if browser storage is unavailable or denied.

### Consumer migration

- `AppShell` reads locale and setter from `useLanguage`; remove its duplicate state and storage effect. Keep `LanguageDropdown` controlled through its existing props.
- Migrate `SplashGate`, `LoginClient`, `SignUpClient`, `VerifyClient`, `NotFoundClient`, `PurchaseClient`, and formulas-demo to the same provider; delete local storage readers and `LANG_MAP`.
- Update locale type and translation imports to their canonical modules. Keep component presentation APIs (`lang` props) where useful for existing composition; do not broaden this change into a component redesign.
- Keep formula title/category/variable translations in `registry.ts`; these are formula-domain data, not duplicate UI strings.
- Remove unused four-language `translations` data/API after all consumers move. Keep `useLanguage` and only its actual required provider API; do not retain compatibility shims for unused uppercase language values.

## Verification

- Add a small dependency-free assert-based self-check for locale validation, legacy normalization, precedence, migration, and storage exceptions. It must be runnable with the repo's existing TypeScript tooling; do not add a test framework or dependency.
- Run the self-check, `pnpm type-check`, and `pnpm build`.
- Grep for `sessionStorage` locale access and confirm only the canonical provider owns `pref-lang` and legacy `language` migration.
- Confirm no imports of the removed uppercase `translations` API remain, all locale types have one definition, and the 5-locale catalog keys/text are unchanged.
- Preserve unrelated pre-existing working-tree edits. Do not commit without explicit user authorization.

## Out of scope

- Changing persistence from `sessionStorage` to cookies, localStorage, URL, or server profile.
- Adding a visible language selector to standalone/auth pages.
- Translating hard-coded page copy not currently sourced from `uiTranslations`.
- Changing formula content, calculation behavior, API routes, or backend locale persistence.
- Refactoring department/level taxonomies beyond removing locale type duplication.

## Risks and mitigations

- **Initial English paint before saved locale applies:** required trade-off for consistent SSR/hydration with session-only storage; state updates immediately after mount.
- **Legacy storage value mismatch:** validate/normalize supported codes; deterministic precedence and fallback are covered by self-check.
- **Storage API throws:** catch reads/writes/removal; retain safe `en` or in-memory state.
- **Large translation move causes accidental text drift:** move existing object mechanically and verify catalog key/value parity before deleting old definition.
