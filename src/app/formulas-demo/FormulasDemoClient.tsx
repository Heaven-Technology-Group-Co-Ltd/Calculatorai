"use client";

import { useMemo, useState } from "react";
import { formulas, getGroupedFormulas } from "@/lib/formulas/registry";
import { FormulaGrid } from "@/components/formulas/FormulaGrid";
import { useLanguage } from "@/lib/LanguageContext";
import { Calculator, Database, Layout, Layers, Code } from "lucide-react";

const advantages = [
  {
    icon: Database,
    title: "Pure Data Registry",
    desc: "ทุกสูตรเป็น object ล้วน ไม่ mixing กับ React หรือ UI",
    detail: "registry.ts มีแค่ data + pure functions ไม่ import React, ไม่มี state, ไม่มี side effects",
  },
  {
    icon: Layout,
    title: "One Generic Card",
    desc: "แทนที่ 1-component-per-formula ด้วย card ตัวเดียว",
    detail: "ของเก่าต้องสร้าง CalculatorCard + CalculatorCardExpanded + icon mapping แยก แต่ละครั้งเพิ่มสูตร ใหม่ระบบแค่เพิ่ม 1 object ใน registry.ts",
  },
  {
    icon: Code,
    title: "Zero Inline Styles",
    desc: "CSS อยู่ใน CSS module ทั้งหมด ไม่มี style=() ใน JSX",
    detail: "ของเก่า CalculatorCardExpanded มี 8+ inline styles ใหม่ใช้ CSS variables + module class ล้วน ๆ",
  },
  {
    icon: Layers,
    title: "Type-Safe Architecture",
    desc: "FormulaDef → Registry → FormulaCard → FormulaGrid สายชัดเจน",
    detail: "แต่ละ layer มี responsibility เดียว แก้ layer ไหนไม่กระทบ layer อื่น การเพิ่ม backend registry เปลี่ยนแค่ data source",
  },
  {
    icon: Calculator,
    title: "Backend-Ready",
    desc: "ย้าย logic ไป backend ได้ทันที ไม่ต้อง refactor ใหม่",
    detail: "calculate() เป็น pure function รับตัวเลขเข้า → ตัวเลขออก ถ้าต้อง移至 server ก็แค่ย้าย registry.ts",
  },
];

export function FormulasDemoClient() {
  const { language: lang } = useLanguage();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const grouped = useMemo(() => getGroupedFormulas(), []);
  const displayed = useMemo(
    () =>
      selectedGroup
        ? grouped.find((g) => g.category === selectedGroup)?.formulas ?? formulas
        : formulas,
    [grouped, selectedGroup],
  );

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* ── Header ── */}
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
        Formula Library Demo
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
        แสดงระบบ FormulaCard ใหม่ — generic, zero inline styles, pure data registry
      </p>

      {/* ── Advantages Grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 16,
        marginBottom: 40,
      }}>
        {advantages.map((adv) => (
          <div key={adv.title} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 20,
          }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: "var(--radius-sm)",
              background: "var(--primary-soft)",
              border: "1px solid var(--primary-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
            }}>
              <adv.icon size={18} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              {adv.title}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>
              {adv.detail}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24,
        alignItems: "center",
      }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Filter:</span>
        <button
          onClick={() => setSelectedGroup(null)}
          type="button"
          style={{
            padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: selectedGroup === null ? "var(--primary-soft)" : "transparent",
            color: selectedGroup === null ? "var(--primary)" : "var(--text-secondary)",
            border: `1px solid ${selectedGroup === null ? "var(--primary-border)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)",
            transition: "all var(--transition-base)",
          }}
        >
          All ({formulas.length})
        </button>
        {grouped.map((g) => (
          <button
            key={g.category}
            onClick={() => setSelectedGroup(g.category)}
            type="button"
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: selectedGroup === g.category ? "var(--primary-soft)" : "transparent",
              color: selectedGroup === g.category ? "var(--primary)" : "var(--text-secondary)",
              border: `1px solid ${selectedGroup === g.category ? "var(--primary-border)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              transition: "all var(--transition-base)",
            }}
          >
            {g.label[lang]} ({g.formulas.length})
          </button>
        ))}
      </div>

      {/* ── Formula Grid ── */}
      <FormulaGrid
        formulas={displayed}
        lang={lang}
        showFormula
      />

      {/* ── Footer — Code Comparison ── */}
      <details style={{ marginTop: 48, cursor: "pointer" }}>
        <summary style={{
          fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
          padding: "8px 0", userSelect: "none",
        }}>
          ดูตัวอย่าง Code เปรียบเทียบ Old vs New
        </summary>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}>
          {/* Old way */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 16, overflow: "auto",
          }}>
            <h4 style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>
              ❌ Old — One component per formula
            </h4>
            <pre style={{ fontSize: 11, lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {`// CalculatorCardExpanded.tsx
export function CalculatorCardExpanded({calc, ...}) {
  // 8+ inline style objects
  // useState logic manually
  // validateInputs() manually per formula
  // Icon switch-case 23 branches
  // setState-in-useEffect workaround

  return (
    <div style={{ /* inline */}}>
      <button style={{ /* inline */}} />
      ...
    </div>
  );
}`}
            </pre>
          </div>

          {/* New way */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 16, overflow: "auto",
          }}>
            <h4 style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, marginBottom: 8 }}>
              ✅ New — Generic card + data registry
            </h4>
            <pre style={{ fontSize: 11, lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {`// registry.ts — pure data
export const formula = {
  id: "geo_sq",
  vars: [{ id: "s", ... }],
  fn: v => v.s ** 2,
};

// FormulaCard.tsx — renders ANY formula
export function FormulaCard({formula, ...}) {
  // 0 inline styles
  // Generic state management
  // Read from formula.fn & formula.vars
  return (
    <div className={styles.card}>
      <button className={styles.header}>
        ...
      </button>
    </div>
  );
}`}
            </pre>
          </div>
        </div>
      </details>
    </main>
  );
}
