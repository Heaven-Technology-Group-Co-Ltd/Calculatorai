---
tags: [session]
date: 2026-07-22
---

# Session: Departments Phase 1 — 22 New Departments + Formulas

**Duration / scope:** ~1 hr — explored codebase, added 21 departments + 22 formulas, verified TypeScript

## What changed
- สร้าง 21 departments ใหม่ + 22 สูตร (1 ต่อ department) ใน `University` level
- เปลี่ยน type `MathSubject` → `string` ให้ `FormulaDef.subject`, `Department.subjects`, `SubDepartment.subjects` รองรับ subject ใหม่ไม่จำกัด
- เพิ่ม `mechanics_of_materials` subject ให้ civil-engineering department เดิม
- Sidebar "All Departments" badge อัพเดทอัตโนมัติ: 23 → 45 (`formulas.length`)
- 23 departments (2 เดิม + 21 ใหม่), 45 สูตร (23 เดิม + 22 ใหม่)

## What's next
- **Phase 2:** ขยายแต่ละ department ให้มีอย่างน้อย 5 สูตร (ใช้ `university-departments-full-list.md` เป็น reference)
- แต่ละ department ปัจจุบันมี 1 formula — ต้อง scale ขึ้น 4-5x
- ใช้ `01-Decisions/2026-07-22--departments-subject-type-change.md` เป็น guideline สำหรับ subject naming

## Anything to remember
- Sidebar icon ทุก department ใช้ `<Building2>` hardcoded — ถ้าอยากให้แต่ละ department แสดง icon ต่างกันต้องแก้ `Sidebar.tsx:206`
- `universitySubDepartments` เป็น legacy array — ไม่มีใคร import ใช้แล้ว แต่ยังเก็บไว้
- `MathSubject` type ยังคงอยู่ทั้งใน `math-data.ts` และ `types/formulas.ts` แม้จะเปลี่ยนไปใช้ `string` แล้ว — ยังมี `CalculatorData.subject` (legacy data array) ที่ยังใช้ `MathSubject` อยู่
