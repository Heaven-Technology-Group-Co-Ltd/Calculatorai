"use client";

import type { FormulaDef, Lang, FormulaResult } from "@/types/formulas";
import { motion, AnimatePresence } from "framer-motion";
import { FormulaCard } from "./FormulaCard";
import { EmptyState } from "@/components/EmptyState";
import styles from "./FormulaGrid.module.css";

interface FormulaGridProps {
  formulas: FormulaDef[];
  lang: Lang;
  showFormula?: boolean;
  onResult?: (result: FormulaResult) => void;
  restorationData?: Record<string, Record<string, string> | null>;
  emptyMessage?: string;
}

export function FormulaGrid({
  formulas,
  lang,
  showFormula = true,
  onResult,
  restorationData,
  emptyMessage = "No formulas found",
}: FormulaGridProps) {
  if (formulas.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={styles.grid}>
      <AnimatePresence mode="popLayout">
        {formulas.map((f, i) => (
          <motion.div
            key={f.id}
            layout
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              opacity: { duration: 0.2 },
              layout: { type: "spring", stiffness: 300, damping: 32, mass: 0.8 },
              default: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
            }}
          >
            <FormulaCard
              formula={f}
              lang={lang}
              showFormula={showFormula}
              onResult={onResult}
              restorationData={restorationData?.[f.id] ?? null}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
