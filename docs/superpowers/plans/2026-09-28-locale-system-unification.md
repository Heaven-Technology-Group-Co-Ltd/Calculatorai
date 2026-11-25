# Locale System Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all UI locale state and UI translations into one five-locale provider and catalog while preserving tab-session behavior.

**Architecture:** `LanguageProvider` owns lowercase `Lang` locale state and `pref-lang` persistence, initializes identically for server render/hydration, then migrates the legacy `language` value after mount. `src/types/locale.ts` owns locale types; `src/lib/translations.ts` owns the five-locale UI catalog; formula translations remain in the formula registry.

**Tech Stack:** Next.js App Router, React Context, TypeScript 5, existing `pnpm` scripts; no added dependency or test framework.

**Spec:** `docs/superpowers/specs/2026-09-28-locale-system-unification-design.md`

## Global Constraints

- Preserve locales exactly: `th`, `en`, `jp`, `ch`, `ko`.
- Persistence remains tab-scoped with `sessionStorage` key `pref-lang`.
- Server render and hydration start at `en`; read storage in an effect after hydration.
- Catch storage read/write/removal failures; in-memory selection must still work.
- Preserve current catalog keys, text, page copy, formula data, and Purchase's locale-independent Stripe product-name behavior.
- No new dependency or framework; no unrelated UI/API/calculation edits.
- Preserve pre-existing working-tree changes; do not commit without explicit authorization.

## Review Focus

- Valid `pref-lang` plus stale legacy `language`: canonical value wins and legacy key is removed.
- Invalid/missing `pref-lang` plus each legacy uppercase/lowercase value, including `KO`: normalize, migrate, or safely default to `en`.
- Storage getter/setter/remove throws: provider still renders, locale can change in memory, and no render crashes.
- SSR/hydration before storage effect: initial `en` output matches; later saved locale update is intentional.
- Consumers across AppShell, auth, not-found, splash, purchase, and formulas-demo: all reflect one live provider value with existing visible text preserved.

---

## File Structure

- Create `src/types/locale.ts`: canonical `Lang` and `Translation` types.
- Modify `src/lib/translations.ts`: replace unused uppercase four-language dictionary with existing five-locale `uiTranslations` and export the typed catalog.
- Create `src/lib/locale-storage.ts`: pure locale validation, legacy normalization, storage migration, and failure-safe restore helpers.
- Modify `src/lib/LanguageContext.tsx`: single provider, deterministic `en` initial state, safe post-mount restore/migrate, `setLanguage`, typed `t`.
- Modify `src/types/formulas.ts`: import `Lang`/`Translation` from canonical locale types, remove duplicates.
- Modify `src/lib/math-data.ts`: remove moved catalog/type definitions; keep current app's departments and levels; temporarily re-export `uiTranslations` for compatibility until consumer migration completes.
- Modify importers under `src/components/` and `src/app/formulas-demo/page.tsx`: use `useLanguage` for runtime locale; use canonical modules for types and catalog; preserve controlled child props.
- Create `src/lib/locale-storage.self-check.mjs`: dependency-free assertions importing the TypeScript helper with Node 22 native type stripping (`node --experimental-strip-types src/lib/locale-storage.self-check.mjs`). Keep helper logic free of browser globals.
- Modify `Log.txt`, `math-calculator-vault/02-Architecture/` locale architecture note if one exists, `math-calculator-vault/03-Sessions/` note, and Brain Map only if structure/session index changes.

## Tasks

### Task 1: Define canonical locale types and safe migration logic

**Files:**
- Create: `src/types/locale.ts`
- Modify: `src/lib/translations.ts`
- Create: `src/lib/locale-storage.ts`
- Create: `src/lib/locale-storage.self-check.mjs`

**Interfaces:**
- Produce: `Lang = "th" | "en" | "jp" | "ch" | "ko"` and `Translation` with keys `th`, `en`, `jp`, `ch`, `ko`.
- Produce: `normalizeLocale(value: string | null): Lang | null` accepting canonical lowercase codes and legacy upper-case codes.
- Produce: `restoreLocale(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): Lang`, reading `pref-lang` first, then legacy `language`, migrating valid legacy values, and returning `en` on missing/invalid values or storage exceptions.
- `restoreLocale` must not make a successful canonical value depend on successful legacy cleanup. Each storage operation that can throw is isolated; state selection still resolves to valid locale or `en`.

- [ ] **Step 1: Write the self-check first**

Create `src/lib/locale-storage.self-check.mjs` with these assertions and local `memoryStorage`/`throwingStorage` fakes. Import the not-yet-created helper from `./locale-storage.ts`:

```js
import assert from "node:assert/strict";
import { normalizeLocale, restoreLocale } from "./locale-storage.ts";

assert.equal(normalizeLocale("ko"), "ko");
assert.equal(normalizeLocale("KO"), "ko");
assert.equal(normalizeLocale("FR"), null);
assert.equal(restoreLocale(memoryStorage({ "pref-lang": "jp", language: "TH" })), "jp");
const migrated = memoryStorage({ language: "KO" });
assert.equal(restoreLocale(migrated), "ko");
assert.equal(migrated.getItem("pref-lang"), "ko");
assert.equal(migrated.getItem("language"), null);
assert.equal(restoreLocale(memoryStorage({ "pref-lang": "bad", language: "bad" })), "en");
assert.equal(restoreLocale(throwingStorage), "en");
console.log("locale-storage self-check passed");
```

Use Node 22's native TS stripping for the `.ts` import from a `.mjs` entry point. Do not add dependencies or build temporary outputs.

- [ ] **Step 2: Run the self-check and confirm it fails**

Run: `node --experimental-strip-types src/lib/locale-storage.self-check.mjs`
Expected: FAIL because `src/lib/locale-storage.ts` does not exist.

- [ ] **Step 3: Add canonical locale types and helper**

Create `src/types/locale.ts` with only the locale union and five-key translation interface. Add `src/lib/locale-storage.ts` implementing `normalizeLocale(value: string | null): Lang | null` and `restoreLocale(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): Lang`. Read canonical key before legacy key. If canonical locale is valid, best-effort remove legacy key and return canonical locale. Otherwise parse legacy; for valid legacy, best-effort write canonical key and remove old key, then return normalized locale even if migration writes fail. Return `en` for invalid/missing data or failed reads.

- [ ] **Step 4: Run the self-check**

Run: `node --experimental-strip-types src/lib/locale-storage.self-check.mjs`
Expected: PASS for canonical precedence, uppercase normalization (include TH/EN/JP/CH/KO table cases), invalid fallback, and throwing storage methods.

- [ ] **Step 5: Move the existing catalog without text edits**

Move `uiTranslations` object verbatim from `src/lib/math-data.ts` to `src/lib/translations.ts`, export it with `satisfies Record<UiTranslationKey, Translation>` and also export the explicit `UiTranslationKey` type so consumer `keyof` types resolve to the full literal key set. Define `UiTranslationKey` as a literal union of every existing catalog key — verify by first listing `Object.keys` in the pre-move source to avoid dropping any key. Keep current spelling, values, and key names exactly. Until consumer migration, preserve the temporary compatibility export in `math-data.ts`:

```ts
export { uiTranslations } from "@/lib/translations";
```

- [ ] **Step 6: Verify catalog parity**

Run a small one-off comparison script against `git show HEAD:src/lib/math-data.ts` and the moved object: extract the `uiTranslations` object from both, parse each as TypeScript object data, and assert identical keys and values. Since the user's working tree may contain prior uncommitted catalog additions, compare against the current pre-move working-tree content saved to a temporary path before moving, not only `HEAD`. Record PASS. Run `pnpm type-check`.

### Task 2: Make LanguageProvider the sole state owner

**Files:**
- Modify: `src/lib/LanguageContext.tsx`
- Modify: `src/lib/locale-storage.ts`

**Interfaces:**
- Consume: `Lang`, `uiTranslations`, `restoreLocale(storage)` from Task 1.
- Produce: `useLanguage(): { language: Lang; setLanguage(lang: Lang): void; t(key): string }`.

- [ ] **Step 1: Implement deterministic provider state**

Remove uppercase `Language`/old catalog use. Initialize `useState<Lang>("en")` only. In `useEffect`, call `restoreLocale(window.sessionStorage)` inside a `try` boundary and set state to returned locale. Implement setter to update state first and then best-effort write `pref-lang`; a storage exception must not block state update. Keep context hook's existing missing-provider error.

- [ ] **Step 2: Type the translation helper**

Derive `UiTranslationKey = keyof typeof uiTranslations`. Define `t(key: UiTranslationKey): string` as `uiTranslations[key][language]`, with no redundant fallback because `Translation` guarantees all locale keys. Preserve exposed `t` API only if no current consumer needs it; otherwise remove it before final migration.

- [ ] **Step 3: Run type-check and provider-focused self-check**

Run the locale self-check and `pnpm type-check`. Expected: tests pass; only expected compile errors are callsites still expecting uppercase language or old key types; record them and resolve in Task 3, do not leave the branch in an unbuildable state at task end.

### Task 3: Migrate all consumers and remove duplicate state

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/SplashGate.tsx`
- Modify: `src/components/login/LoginClient.tsx`
- Modify: `src/components/signup/SignUpClient.tsx`
- Modify: `src/components/verify/VerifyClient.tsx`
- Modify: `src/components/not-found/NotFoundClient.tsx`
- Modify: `src/components/purchase/PurchaseClient.tsx`
- Modify: `src/app/formulas-demo/page.tsx`
- Modify: locale/type/catalog imports in all other files listed below

**Interfaces:**
- Consume: root provider API from Task 2.
- Preserve: `FormulaGrid`, `LanguageDropdown`, `LoadingScreen`, `InfoModal`, `ConfirmModal`, `HistorySidebar`, `Sidebar`, `LevelFilter`, and `FormulaCard` presentation props unless current prop typing forces a narrow rename. Runtime state always comes from provider.

- [ ] **Step 1: Migrate AppShell and main-app descendants**

Replace AppShell's local `useState`/`sessionStorage` state/effect with `const { language: lang, setLanguage: setLang } = useLanguage()`. Keep its current `lang` prop wiring to controlled dropdown and child components. Preserve all current UI behavior. Use `Lang` from `@/types/locale` only where explicit annotation remains needed.

- [ ] **Step 2: Migrate SplashGate and standalone clients**

Use `useLanguage()` in SplashGate, LoginClient, SignUpClient, VerifyClient, NotFoundClient, and PurchaseClient. Remove `detectLang`, `getStoredLang`, local `lang` state, and direct locale-key access. Replace local `tr` closures with provider `t` only when its keys align; otherwise use `uiTranslations[key][language]` from the shared catalog without reading storage. Preserve current special copy and conditionals. Keep SplashGate's unrelated `splash_seen` storage behavior untouched. Keep Purchase's product name/API request behavior unchanged.

- [ ] **Step 3: Migrate formulas-demo**

Remove `LANG_MAP`, uppercase `Language` assumptions, and use `const { language: lang } = useLanguage()`. Preserve formula group and grid localized labels.

- [ ] **Step 4: Migrate remaining type/catalog imports**

Change all type-only `Lang` imports from `@/lib/math-data` and `@/types/formulas` to `@/types/locale`. Change all `uiTranslations` imports from `@/lib/math-data` to `@/lib/translations`. Update direct `Translation` imports to the canonical type module. These importers include `Sidebar.tsx`, `ConfirmModal.tsx`, `LevelTabs.tsx`, `LevelFilter.tsx`, `HomeHero.tsx`, `ResetPasswordClient.tsx`, `FormulaCard.tsx`, `InfoModal.data.ts`, `InfoModal.tsx`, `LoadingScreen.config.ts`, `LoadingScreen.tsx`, `HistorySidebar.data.ts`, `HistorySidebar.tsx`, `SidebarFooter.tsx`, `LanguageDropdown.tsx`, `LoginClient.tsx`, `SignUpClient.tsx`, `VerifyClient.tsx`, and `NotFoundClient.tsx`.

- [ ] **Step 5: Remove temporary compatibility export and duplicate types**

After search confirms no import of `uiTranslations` or `Lang` from `@/lib/math-data`, remove its compatibility re-export and `Lang`/`Translation` definitions. Keep `Department`, `LevelSection`, `departments`, `levels` intact. In `src/types/formulas.ts`, import `Lang`/`Translation` types from `@/types/locale` as needed by existing API; remove duplicate declarations.

- [ ] **Step 6: Search for locale storage access and old API imports**

Run:

```sh
grep -RInE 'sessionStorage.*(pref-lang|language)|getStoredLang|detectLang|LANG_MAP|LanguageContext|translations\[' src --include='*.ts' --include='*.tsx'
grep -RInE 'from ["'"'][^"'"']*(lib/math-data|types/formulas|lib/translations)' src --include='*.ts' --include='*.tsx'
```

Expected: locale storage keys occur only in `src/lib/locale-storage.ts` and provider setter/context; no consumer reads storage. No import from old uppercase `translations` API. Other math-data imports may remain only for department/level records.

- [ ] **Step 7: Run self-check and type-check**

Run self-check, `pnpm type-check`, then `pnpm build`. Expected: all succeed; all five locales render from the same provider. If `.next/dev/types/validator.ts` references deleted routes (stale generated artifacts), remove only the stale generated validator and rerun type-check; do not change application routes to satisfy stale output.

### Task 4: Document and final verification

**Files:**
- Modify: `math-calculator-vault/02-Architecture/frontend-design-direction.md` (or the existing locale architecture note if one is found)
- Create: `math-calculator-vault/03-Sessions/2026-09-28--locale-system-unification.md`
- Modify: `math-calculator-vault/Project-Brain-Map.md` only if its architecture/session index needs a new row
- Modify: `Log.txt`
- No commit

**Interfaces:**
- Consume: verified implementation from Tasks 1–3.
- Produce: documentation that accurately describes locale owner, key, fallback, and verification outcomes.

- [ ] **Step 1: Verify final behavior and import boundaries**

Run locale self-check and `pnpm type-check`; run `pnpm build` and capture its exit status. Search again for storage reads, duplicated locale type declarations, obsolete `Language`/`translations` use, and ensure catalog keys/text are parity-checked.

- [ ] **Step 2: Update architecture/session records and Log.txt**

Document one provider, five-locale type/catalog ownership, `pref-lang`, legacy migration, hydration default `en`, and error behavior. Session note records actual check results and any behavior caveat. Append one timestamped concise `Log.txt` entry. Update Brain Map only if this repository's session index tracks the new session (it currently does).

- [ ] **Step 3: Report completion without committing**

Summarize files, behavior, self-check/type-check/build results, and any known limitation. Do not run `git commit` or modify unrelated dirty files.
