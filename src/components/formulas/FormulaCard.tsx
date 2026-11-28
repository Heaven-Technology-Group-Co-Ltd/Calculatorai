"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronDown,
  Calculator,
  RotateCw,
  Square,
  Variable,
  BarChart3,
  FunctionSquare,
  Atom,
  Hash,
  DollarSign,
  Briefcase,
  TrendingUp,
  LineChart,
  BookOpen,
  Building2,
  Settings,
  Droplets,
  Layers,
  Box,
  type LucideIcon,
} from "lucide-react";
import type { FormulaDef, FormulaResult } from "@/types/formulas";
import type { Lang } from "@/types/locale";
import { formatNum, validateInputs } from "@/lib/calc-utils";
import { uiTranslations } from "@/lib/translations";
import { departments } from "@/lib/math-data";
import { levelMeta } from "@/lib/formulas/registry";
import styles from "./FormulaCard.module.css";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Subject → Icon Mapping ─── */
const subjectIcon: Record<string, LucideIcon> = {
  geometry: Square,
  algebra: Variable,
  statistics: BarChart3,
  calculus: FunctionSquare,
  physics: Atom,
  numbers: Hash,
  financial: DollarSign,
  business: Briefcase,
  investment: TrendingUp,
  economics: LineChart,
  accounting: BookOpen,
  structure: Building2,
  mechanics: Settings,
  hydraulics: Droplets,
  geotechnical: Layers,
  materials: Box,
};

/* ─── Department → Flat Background Color Mapping ─── */
const DEPT_BG: Record<string, string> = {
  business: "rgba(249, 115, 22, 0.08)",
  "civil-engineering": "var(--error-bg)",
};

function getIconBg(subject?: string): string {
  if (!subject) return "rgba(255, 255, 255, 0.04)";

  // Find department by matching subject to its subjects array
  const dept = departments.find((d) =>
    d.subjects.includes(subject as FormulaDef["subject"]),
  );
  if (dept) return DEPT_BG[dept.id] ?? "rgba(255, 255, 255, 0.04)";

  return "rgba(255, 255, 255, 0.04)";
}

/* ─── Subject → Department label lookup ─── */
interface DeptLabel {
  id: string;
  label: Record<string, string>;
}

function getDepartmentForSubject(subject?: string): DeptLabel | undefined {
  if (!subject) return undefined;
  const dept = departments.find((d) =>
    d.subjects.includes(subject as FormulaDef["subject"]),
  );
  if (!dept) return undefined;
  return {
    id: dept.id,
    label: dept.label as unknown as Record<string, string>,
  };
}

/* ─── Component ─── */
interface FormulaCardProps {
  formula: FormulaDef;
  lang: Lang;
  showFormula?: boolean;
  onResult?: (result: FormulaResult) => void;
  restorationData?: Record<string, string> | null;
}

function FormulaCardInner({
  formula,
  lang,
  showFormula = true,
  onResult,
  restorationData,
}: FormulaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    if (restorationData) return restorationData;
    const init: Record<string, string> = {};
    formula.vars.forEach((v) => {
      if (v.def !== undefined) init[v.id] = String(v.def);
    });
    return init;
  });
  const [result, setResult] = useState<string | null>(null);
  const [multiResult, setMultiResult] = useState<Record<string, number> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Mounted cards never re-read the lazy useState init, so a restore-from-history
  // arrives as a changed restorationData prop and must be synced in explicitly.
  useEffect(() => {
    if (!restorationData) return;
    // JSON.stringify compare is fine here: inputs are tiny key/value maps, and it
    // skips clobbering in-flight typing when handleAddToHistory writes the same
    // card's inputs back as an identical object.
    if (JSON.stringify(inputs) === JSON.stringify(restorationData)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-sync into mounted card's local state, same pattern as useHistory hydrate
    setInputs(restorationData);
  }, [restorationData, inputs]);

  const IconComponent = subjectIcon[formula.subject] ?? Calculator;
  const iconBg = getIconBg(formula.subject);
  const deptInfo = getDepartmentForSubject(formula.subject);

  /* ── Formula preview text ── */
  const formulaPreview = useMemo(() => {
    if (formula.fStr) return formula.fStr;
    const desc = formula.title[lang];
    return desc.length > 40 ? desc.substring(0, 40) + "…" : desc;
  }, [formula.fStr, formula.title, lang]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleCalculate = useCallback(() => {
    const validation = validateInputs(
      formula.vars,
      inputs,
      {
        invalidInput: uiTranslations.invalidInput[lang],
        divByZero: uiTranslations.divByZero[lang],
      },
      formula.chk,
    );

    if (validation.error) {
      setError(validation.error);
      setResult(null);
      setMultiResult(null);
      return;
    }

    try {
      const res = formula.fn(validation.parsed);
      setError(null);

      if (typeof res === "object" && res !== null) {
        setMultiResult(res as Record<string, number>);
        setResult(null);
        const firstKey = Object.keys(res)[0];
        const firstVal = formatNum((res as Record<string, number>)[firstKey]);
        onResult?.({
          calcId: formula.id,
          calcTitle: formula.title[lang],
          inputs: validation.rawSaved,
          result: firstVal,
          unit: formula.unit,
        });
      } else {
        const val = res as number;
        const formatted = formatNum(val);
        setResult(formatted);
        setMultiResult(null);
        onResult?.({
          calcId: formula.id,
          calcTitle: formula.title[lang],
          inputs: validation.rawSaved,
          result: formatted,
          unit: formula.unit,
        });
      }
    } catch {
      setError(uiTranslations.calcError[lang]);
    }
  }, [formula, inputs, lang, onResult]);

  const handleReset = useCallback(() => {
    const init: Record<string, string> = {};
    formula.vars.forEach((v) => {
      if (v.def !== undefined) init[v.id] = String(v.def);
    });
    setInputs(init);
    setResult(null);
    setMultiResult(null);
    setError(null);
  }, [formula.vars]);

  const handleInputChange = useCallback((id: string, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
    setResult(null);
    setMultiResult(null);
    setError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && expanded) {
        e.preventDefault();
        handleCalculate();
      }
    },
    [expanded, handleCalculate],
  );

  const inputColClass =
    formula.vars.length === 1
      ? "single-col"
      : formula.vars.length <= 3
        ? ""
        : "three-col";

  return (
    <div
      className={`${styles.card} ${styles.cardInteractive} ${expanded ? styles.cardExpanded : ""}`}
    >
      {/* ── Header (entire card top clickable) ── */}
      <button
        className={styles.header}
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={`${formula.title[lang]} — ${formula.cat[lang]}`}
        type="button"
      >
        <div className={styles.headerMain}>
          <div
            className={styles.cardIcon}
            style={{ background: iconBg }}
          >
            <IconComponent size={16} color="var(--primary)" />
          </div>
          <div className={styles.tileInfo}>
            <h3 className="tile-title">{formula.title[lang]}</h3>
            <p className="tile-desc">{formula.cat[lang]}</p>
          </div>
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
          />
        </div>

        <div className={styles.headerMeta}>
          <div className={styles.cardFormula}>{formulaPreview}</div>
          <div className={styles.cardTags}>
            <span className={styles.cardTag}>
              {levelMeta[formula.level]?.[lang] ?? formula.level}
            </span>
            {deptInfo && (
              <span className={styles.cardTag}>{deptInfo.label[lang]}</span>
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded Content ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { height: "auto", opacity: 1 },
              collapsed: { height: 0, opacity: 0 },
            }}
            transition={{
              duration: 0.25,
              ease: [0.25, 1, 0.5, 1],
            }}
            className={styles.expandedFormula}
            onKeyDown={handleKeyDown}
          >
            <div className={styles.divider} />

            <div className={styles.content}>
              {/* Input fields */}
              <div className={`tile-input-row ${inputColClass}`}>
                {formula.vars.map((v) => (
                  <div key={v.id}>
                    <label className={styles.inputLabel}>
                      {v.label[lang]}{" "}
                      {v.u && (
                        <span className={styles.inputUnit}>({v.u})</span>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="p-input"
                      placeholder={
                        v.placeholder?.[lang] ??
                        (v.def !== undefined ? String(v.def) : "")
                      }
                      value={inputs[v.id] ?? ""}
                      onChange={(e) => handleInputChange(v.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCalculate();
                      }}
                      aria-label={v.label[lang]}
                    />
                  </div>
                ))}
              </div>

              {/* Calculate / Reset buttons */}
              <div className={styles.actions}>
                <button className="p-calc-btn" onClick={handleCalculate} type="button">
                  <Calculator size={16} />
                  {uiTranslations.calculate[lang]}
                </button>
                <button
                  className={`p-calc-btn ${styles.btnSecondary}`}
                  onClick={handleReset}
                  type="button"
                >
                  <RotateCw size={16} />
                  {uiTranslations.reset[lang]}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className={styles.errorBox} role="alert">
                  {error}
                </div>
              )}

              {/* Multi-result */}
              {multiResult && !error && (
                <div className={styles.multiResult}>
                  {Object.entries(multiResult).map(([key, val]) => (
                    <div className={`p-result ${styles.multiResultItem}`} key={key}>
                      <span className="p-result-label">
                        {formula.resultLabels?.[key]?.[lang] ?? key}
                      </span>
                      <span>{formatNum(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Single result */}
              {result !== null && !error && (
                <div className={`p-result ${styles.singleResult}`}>
                  <span className="p-result-label">
                    {lang === "th" ? "ผลลัพธ์" : "Result"}
                  </span>
                  <span>
                    {result} {formula.unit}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const FormulaCard = React.memo(FormulaCardInner);
