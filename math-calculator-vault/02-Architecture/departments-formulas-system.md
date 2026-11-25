---
tags: [architecture]
status: active
last-updated: 2026-09-28
---

# Architecture: Departments & Formulas System

## Current State
ระบบ department-formula เชื่อมกันผ่าน `subject` string matching:

```
Department.subjects[]  ←→  FormulaDef.subject
        │                        │
        └── getFormulaCountByDepartment(subjects)
             นับจำนวน formula ที่ f.subject ∈ dept.subjects
```

**ไฟล์หลัก:**
- `src/lib/math-data.ts` — `Department` interface + `departments` array (23 departments) + `LevelSection` + `levels` + `uiTranslations` (legacy formula catalog and duplicate formula types removed 2026-09-28)
- `src/types/formulas.ts` — `FormulaDef` interface
- `src/lib/formulas/registry.ts` — `formulas` array (45 formulas) + `getFormulaCountByDepartment()`

**การกรอง (AppShell.tsx:137-148):**
```typescript
const matchDept =
  activeDepartment === "all" ||
  departments.find(d => d.id === activeDepartment)?.subjects.includes(c.subject);
```

**Sidebar badge (Sidebar.tsx:191):**
- "All Departments" → `{formulas.length}` (ปัจจุบัน 45)
- แต่ละ department → `{getFormulaCountByDepartment(dept.subjects)}`

## Diagram
```
┌─────────────────────────────────────────┐
│           23 Departments                 │
│  ┌──────────┐  ┌──────────────────┐     │
│  │ business │  │ civil-engineering│ ... │
│  │ subjects:│  │ subjects:        │     │
│  │ financial│  │ structure        │     │
│  │ business │  │ mechanics        │     │
│  │ investment│ │ hydraulics      │     │
│  │ economics│  │ geotechnical     │     │
│  │ accounting│ │ materials       │     │
│  │          │  │ mechanics_of_   │     │
│  │          │  │   materials ←───┼───┐ │
│  └──────────┘  └──────────────────┘   │ │
│                                       │ │
│  ┌────────────────────┐               │ │
│  │ mechanical-eng     │               │ │
│  │ subjects:          │               │ │
│  │ mechanics_of_      │               │ │
│  │   materials ←──────┼───────────────┘ │
│  └────────────────────┘                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           45 Formulas                    │
│  ce_moment_inertia.subject =            │
│    "mechanics_of_materials"             │
│  (matches BOTH civil-engineering AND    │
│   mechanical-engineering via multi-tag) │
└─────────────────────────────────────────┘
```

## Key Files / Locations
- `src/lib/math-data.ts:69-250+` — Department interface + departments array (23 entries)
- `src/types/formulas.ts:45-59` — FormulaDef interface
- `src/lib/formulas/registry.ts:7-395+` — formulas array (45 entries) + helper functions
- `src/components/Sidebar.tsx:165-214` — Department sidebar rendering
- `src/components/AppShell.tsx:137-148` — Filter logic (search + level + department)

## Known Limitations
- Sidebar ทุก department ใช้ icon `<Building2>` hardcoded (บรรทัด 206) — `dept.icon` ไม่ได้ถูกใช้
- multi-tag ผ่าน subject matching เท่านั้น — ไม่มี `departments: string[]` field บน FormulaDef
- Legacy `data: CalculatorData[]`, duplicate `CalcVar`/`MathSubject`, and unused `universitySubDepartments` were removed from `math-data.ts` on 2026-09-28; `src/types/formulas.ts` now owns shared formula types. `calc-utils.ts` imports `CalcVar` from that module.
- `src/lib/formulas/registry.ts` is the sole runtime formula catalog; keep formula additions there.

## Change History
- 2026-09-28: Removed legacy 23-formula `CalculatorData[]` catalog and duplicate formula types from `math-data.ts`; consolidated shared formula types in `src/types/formulas.ts` ([[03-Sessions/2026-09-28--formula-catalog-consolidation]])
- 2026-07-22: Phase 1 — เพิ่ม 21 departments + 22 formulas, เปลี่ยน subject type เป็น string ([[2026-07-22--departments-subject-type-change]])
- 2026-07-21: Department filtering implemented — ปุ่ม department ใช้งานได้, real formula counts ([[department-filtering-implemented]])
- 2026-07-18: Initial scaffold — 2 departments (Business, Civil Engineering), 23 formulas
