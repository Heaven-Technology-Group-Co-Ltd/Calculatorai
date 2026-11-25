---
tags: [session, architecture]
date: 2026-09-28
---

# Session: Formula catalog consolidation

**Duration / scope:** Candidate 1 from the 2026-09-27 architecture review — delete the orphan legacy formula catalog from `src/lib/math-data.ts`, make `src/types/formulas.ts` the single formula-type owner, no behavior change.

## What changed
- `src/lib/math-data.ts`: removed legacy `data: CalculatorData[]` (23 formulas, all superseded by the 45-formula registry), `CalculatorData`, `SubDepartment`, `universitySubDepartments`, and duplicate `CalcVar`/`MathSubject`. Kept `Lang`, `Translation`, `LevelSection`, `Department`, `departments`, `uiTranslations`, `levels`.
- `src/lib/calc-utils.ts`: `CalcVar` now imports from `@/types/formulas` instead of `@/lib/math-data`.
- Updated stale `src/lib/formulas/registry.ts` header to report 45 formulas.
- Verified with `pnpm type-check` (0 errors after removing stale `.next/dev/types/validator.ts`) and `pnpm build` (exit 0). No Vitest infra existed; user chose type-check + build as the gate.

## What's next
- No commit yet (user decides when).
- Candidate 2 (locale-module unification) and 3 (dashboard aggregation) remain open in `CODEBASE.md` friction review.

## Anything to remember
- `src/lib/formulas/registry.ts` is the live catalog (45 formulas); `math-data.ts` no longer carries formula data.
- Next.js 16.3.x is out (16.3.6); project pinned 16.2.6. No major bump, but flag per Version Watch if it becomes 16.3.
