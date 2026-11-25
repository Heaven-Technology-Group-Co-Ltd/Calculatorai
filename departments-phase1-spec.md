# Departments Implementation Spec — Phase 1 (1 Formula/Department)

> ใช้ไฟล์นี้เป็น prompt/context ให้ Claude Code หรือ Opencode implement ต่อในโปรเจกต์ Premium Math Calculator
> Phase 1: เพิ่มครบ 22 departments โดยแต่ละสาขามี **1 สูตรตั้งต้น** ก่อน แล้วค่อย scale เพิ่มทีหลัง (Phase 2)

## Task

เพิ่ม 22 departments ใหม่เข้าไปในระบบเดิม (ที่ตอนนี้มี `University` level → `Business`, `Civil Engineering` departments อยู่แล้ว) โดย:

1. เพิ่ม department แต่ละอันเข้า `departments` config
2. เพิ่ม 1 formula ตัวอย่างต่อ department เข้า `formulas` config
3. Formula สามารถ tag ได้หลาย department (multi-tag) ถ้ามีความเกี่ยวข้องข้ามสาขา (ดู pattern เดิม เช่น Depreciation ติดทั้ง `University` + `Business`)
4. คง schema เดิม ไม่ breaking change กับ Business/Civil Engineering ที่มีอยู่แล้ว

## Suggested Schema (ปรับตาม codebase จริงได้)

```typescript
interface Department {
  id: string;               // slug, e.g. "mechanical-engineering"
  nameKey: string;          // i18n key, e.g. "dept.mechanicalEngineering"
  nameEn: string;
  icon: string;              // lucide-react icon
  category: "engineering" | "science" | "business" | "social" | "arts" | "health";
}

interface Formula {
  id: string;
  titleKey: string;
  titleEn: string;
  subCategory: string;       // e.g. "Linear Algebra", "Structure"
  expression: string;
  departments: string[];     // department ids, e.g. ["university", "mechanical-engineering"]
}
```

## 22 Departments — 1 Formula Each

| # | Department ID | Category | Formula Title | Sub-category | Expression |
|---|---|---|---|---|---|
| 1 | `mechanical-engineering` | engineering | Stress-Strain | Mechanics of Materials | `σ = F / A` |
| 2 | `electrical-engineering` | engineering | Ohm's Law | Circuits | `V = I × R` |
| 3 | `computer-science` | engineering | Binary Search Complexity | Algorithms | `T(n) = O(log n)` |
| 4 | `civil-engineering` | engineering | Moment of Inertia (Rectangle) | Structure | `I = bh³ / 12` |
| 5 | `chemical-engineering` | engineering | Reynolds Number | Fluid Mechanics | `Re = ρvD / μ` |
| 6 | `industrial-engineering` | engineering | Economic Order Quantity | Operations | `EOQ = √(2DS/H)` |
| 7 | `aerospace-engineering` | engineering | Lift Equation | Aerodynamics | `L = ½ρv²SC_L` |
| 8 | `environmental-engineering` | engineering | Dilution Formula | Water Treatment | `C1V1 = C2V2` |
| 9 | `physics` | science | Newton's Second Law | Mechanics | `F = ma` |
| 10 | `mathematics-statistics` | science | Standard Deviation | Statistics | `σ = √(Σ(x-μ)² / N)` |
| 11 | `chemistry` | science | Molarity | Solutions | `M = mol / L` |
| 12 | `biology-genetics` | science | Population Growth | Ecology | `N(t) = N₀e^(rt)` |
| 13 | `business-administration` | business | ROI | Finance | `ROI = (Gain - Cost) / Cost × 100` |
| 14 | `economics` | business | GDP | Macroeconomics | `GDP = C + I + G + (X - M)` |
| 15 | `accounting` | business | Current Ratio | Financial Ratios | `CR = Current Assets / Current Liabilities` |
| 16 | `finance-investment` | business | Net Present Value | Investment | `NPV = Σ[Ct / (1+r)^t] - C0` |
| 17 | `political-science` | social | Gini Coefficient | Public Policy | `G = A / (A + B)` |
| 18 | `psychology` | social | Z-score | Statistics | `z = (x - μ) / σ` |
| 19 | `education` | social | Grade Point Average | Assessment | `GPA = Σ(grade × credit) / Σcredit` |
| 20 | `architecture` | arts | Golden Ratio | Design | `φ = (1 + √5) / 2` |
| 21 | `data-science-ai` | arts | Sigmoid Function | Machine Learning | `σ(x) = 1 / (1 + e^(-x))` |
| 22 | `medicine-pharmacy` | health | Dosage Calculation | Pharmacology | `Dose = mg/kg × weight` |

## Notes for Implementation

- **Tag ทุก formula ด้วย `"university"`** เสมอ (ตาม pattern เดิม เช่น `University` + `Business`)
- **Icon แนะนำ** (lucide-react): mechanical→`Cog`, electrical→`Zap`, cs→`Code2`, civil→`Building2` (มีแล้ว), chemical→`FlaskConical`, industrial→`Factory`, aerospace→`Plane`, environmental→`Leaf`, physics→`Atom`, math-stats→`Sigma`, chemistry→`TestTube`, biology→`Dna`, business→`Briefcase` (มีแล้ว), economics→`TrendingUp`, accounting→`Calculator`, finance→`DollarSign`, political-science→`Scale`, psychology→`Brain`, education→`GraduationCap`, architecture→`Ruler`, data-science→`Bot`, medicine→`Stethoscope`
- ห้าม breaking change กับ department count เดิม (`Business: 5`, `Civil Engineering: 5`, `All: 23`) — ต้อง update count badge ให้ตรงหลังเพิ่ม
- Phase 2 (ทีหลัง): ขยายแต่ละ department ให้มีอย่างน้อย 5 สูตร (ดู reference เต็มในไฟล์ `university-departments-full-list.md`)

## Acceptance Criteria

- [ ] Sidebar "DEPARTMENTS" badge นับจำนวนถูกต้อง (23 เดิม + 22 ใหม่ = 45)
- [ ] แต่ละ formula card แสดง tag department ถูกต้อง ตรงกับ multi-tag ที่กำหนด
- [ ] ค้นหา (search formulas) หา formula ใหม่เจอทุกตัว
- [ ] ไม่กระทบ formula/department เดิมที่มีอยู่ (Business, Civil Engineering)
- [ ] i18n key ครบสำหรับ TH/EN อย่างน้อย (JP/CN/KO ทำทีหลังได้)
