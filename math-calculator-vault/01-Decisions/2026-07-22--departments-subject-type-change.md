---
tags: [decision]
status: active
date: 2026-07-22
---

# Decision: Widened MathSubject → string for Department/Formula linking

## Context
Phase 1 departments spec ต้องการเพิ่ม 22 departments ใหม่ แต่ `MathSubject` union type จำกัด subject values ไว้แค่ 17 ค่า (geometry, algebra, … materials) ทำให้ไม่สามารถเพิ่ม subject ใหม่ให้ departments ใหม่ได้โดยไม่แก้ type ทุกครั้ง

## Decision
เปลี่ยน `FormulaDef.subject: MathSubject` → `string`, `Department.subjects: MathSubject[]` → `string[]`, `SubDepartment.subjects: MathSubject[]` → `string[]`

## Alternatives Considered
- **Extend MathSubject union ทุกครั้ง** — เพิ่ม 22 literal values ทำให้ union ใหญ่เกิน (39+ values) และต้อง sync ทั้ง 2 ไฟล์ (`types/formulas.ts` + `math-data.ts`) ทุกครั้งที่เพิ่ม department ใหม่ — rejected เพราะ maintenance burden สูง
- **แยกเป็น `string` เลย** — accepted เพราะ `getFormulaCountByDepartment(subjects: string[])` รับ `string[]` อยู่แล้ว ไม่มี type error ที่จุดเชื่อมต่อ

## Consequences
- ✅ เพิ่ม department/subject ใหม่ได้ไม่จำกัด ไม่ต้องแก้ type
- ✅ TypeScript ยัง type-check ได้ในจุดที่สำคัญ (FormulaDef, Department interfaces)
- ⚠️ `CalculatorData.subject` (legacy data array) ยังใช้ `MathSubject` อยู่ — ยังไม่เปลี่ยนเพราะ legacy code ไม่มีผลกับระบบปัจจุบัน
- ⚠️ เสีย type-safety เล็กน้อยที่ subject field — ถ้าสะกดผิดจะไม่จับตอน compile แต่จะแสดงผลแค่ตอน runtime (formula ไม่ match กับ department ใดๆ)

## Related
- [[# Formula Library Architecture]]
- [[2026-07-18--frontend-backend-bot-split]]
