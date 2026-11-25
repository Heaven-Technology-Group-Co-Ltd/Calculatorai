// types/formulas.ts
// Formula Library — core type definitions for the generic FormulaCard system

import type { Lang, Translation } from "@/types/locale";

export type { Lang, Translation };

export interface CalcVar {
  id: string;
  label: Translation;
  u?: string;
  placeholder?: Translation;
  def?: number;
}

export type MathSubject =
  | "geometry"
  | "algebra"
  | "statistics"
  | "calculus"
  | "logic"
  | "physics"
  | "numbers"
  | "financial"
  | "business"
  | "investment"
  | "economics"
  | "accounting"
  | "structure"
  | "mechanics"
  | "hydraulics"
  | "geotechnical"
  | "materials";

export type FormulaFn = (
  v: Record<string, number>,
) => number | Record<string, number>;

export interface FormulaDef {
  id: string;
  level: "elementary" | "middleSchool" | "highSchool" | "university";
  cat: Translation;
  subject: string;
  icon: string;
  title: Translation;
  fStr: string;
  vars: CalcVar[];
  unit: string;
  fn: FormulaFn;
  chk?: string[];
  multiResult?: string[];
  resultLabels?: Record<string, Translation>;
}

/** Grouped formulas by category for section rendering */
export interface FormulaGroup {
  category: string;
  label: Translation;
  formulas: FormulaDef[];
}

/** Result payload emitted by FormulaCard */
export interface FormulaResult {
  calcId: string;
  calcTitle: string;
  inputs: Record<string, string>;
  result: string;
  unit: string;
}
