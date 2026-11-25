import { CalcVar } from "@/types/formulas";

export function formatNum(n: number): string {
  if (Number.isNaN(n)) return "—";
  if (!isFinite(n)) return "Infinity";
  const p = parseFloat(n.toPrecision(10));
  if (Number.isInteger(p)) return p.toLocaleString("en-US");
  return p.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

function resolveCommas(s: string): string {
  // Thousands separators: groups of exactly 3 digits. "1,500" and "1,234,567".
  if (/^-?\d{1,3}(,\d{3})+$/.test(s)) return s.replace(/,/g, "");
  // Single comma as decimal separator (locales that write 1,5): "1,5" → "1.5".
  if (/^-?\d+,\d+$/.test(s)) return s.replace(",", ".");
  // Any other comma use is unsupported; keeping the comma makes Number() yield NaN
  // so validateInputs rejects instead of silently guessing a value.
  return s;
}

export function normalizeInput(raw: string): string {
  let s = raw.replace(/\s/g, "");
  s = s.replace(/[−–—]/g, "-");
  s = resolveCommas(s);
  s = s.replace(/[xX×*]?10\^/g, "e");
  s = s.replace(/[xX×*]10/g, "e");
  // Comma stays in the allowed set on purpose: a comma surviving resolveCommas
  // must survive this strip so Number() sees it and fails.
  return s.replace(/[^0-9.,eE+\-]/g, "");
}

export interface ValidationResult {
  parsed: Record<string, number>;
  rawSaved: Record<string, string>;
  error: string | null;
}

export function validateInputs(
  vars: CalcVar[],
  inputs: Record<string, string>,
  errorMessages: { invalidInput: string; divByZero: string },
  chk?: string[]
): ValidationResult {
  const parsed: Record<string, number> = {};
  const rawSaved: Record<string, string> = {};

  for (const v of vars) {
    const raw = (inputs[v.id] ?? (v.def !== undefined ? String(v.def) : "")).trim();
    rawSaved[v.id] = raw;

    const normalized = normalizeInput(raw);
    const val = Number(normalized);

    if (raw === "" || isNaN(val)) {
      return { parsed: {}, rawSaved: {}, error: errorMessages.invalidInput };
    }
    parsed[v.id] = val;
  }

  if (chk) {
    for (const key of chk) {
      // "a-b" entries guard a difference divisor (e.g. breakeven's p − vc), since
      // plain var-id entries can only catch a var that is itself 0.
      const diff = /^(\w+)-(\w+)$/.exec(key);
      const val = diff ? parsed[diff[1]] - parsed[diff[2]] : parsed[key];
      if (val === 0) {
        return { parsed: {}, rawSaved: {}, error: errorMessages.divByZero };
      }
    }
  }

  return { parsed, rawSaved, error: null };
}
