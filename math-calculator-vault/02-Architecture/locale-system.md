---
tags: [architecture, locale, language, i18n]
status: active
last-updated: 2026-09-28
---

# Architecture: Locale System

## Current State
- UI locale state is owned by one root `LanguageProvider` (`src/lib/LanguageContext.tsx`).
- Supported locale codes are canonical lowercase values: `th`, `en`, `jp`, `ch`, `ko`.
- `LanguageProvider` initializes at `en` for SSR and hydration, then reads
  `window.sessionStorage` in a post-mount effect through `restoreLocale`.
- Tab-scoped persistence uses `sessionStorage["pref-lang"]`.
- `src/lib/locale-storage.ts` owns locale validation, legacy migration, and
  failure-safe restore behavior.

## Module Boundaries
| Module | Responsibility |
|---|---|
| `src/types/locale.ts` | Canonical `Lang` union and five-key `Translation` interface |
| `src/lib/translations.ts` | Five-locale `uiTranslations` catalog plus `UiTranslationKey` |
| `src/lib/locale-storage.ts` | Pure `normalizeLocale` and `restoreLocale` helpers with no browser globals |
| `src/lib/LanguageContext.tsx` | Root provider for `language`, `setLanguage`, and typed `t` |
| `src/types/formulas.ts` | Formula-domain types that consume canonical locale types |

## Behavior
- Consumers call `useLanguage()` and must not read `pref-lang` or legacy
  `language` directly.
- `restoreLocale` prefers valid `pref-lang`; if that value is missing or
  invalid, it migrates a valid legacy `language` value when present.
- Legacy uppercase values are normalized to lowercase locale codes.
- Storage getter/setter/removal failures are isolated; the provider still
  renders and in-memory language changes still work.
- Formula translations remain in the formula registry. Purchase keeps its
  locale-independent Stripe product-name behavior.

## Verification
- Self-check: `node --experimental-strip-types src/lib/locale-storage.self-check.mjs`
- Type gate: `pnpm type-check`
- Build gate: `pnpm build`

## Change History
- 2026-09-28: Unified locale ownership under `LanguageProvider`, moved
  locale types/catalog to canonical modules, and added legacy
  `language` → `pref-lang` migration.
