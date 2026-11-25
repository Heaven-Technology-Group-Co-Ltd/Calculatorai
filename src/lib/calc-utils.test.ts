import { describe, expect, it } from "vitest";
import { formatNum, normalizeInput, validateInputs } from "./calc-utils";
import { getFormulaById } from "./formulas/registry";

const ERR = { invalidInput: "invalid", divByZero: "div" };

function parseOf(formulaId: string, inputs: Record<string, string>) {
  const f = getFormulaById(formulaId)!;
  return validateInputs(f.vars, inputs, ERR, f.chk);
}

describe("normalizeInput comma grammar", () => {
  it("parses 1,5 as the decimal 1.5", () => {
    expect(Number(normalizeInput("1,5"))).toBe(1.5);
  });

  it("parses 1,500 as the thousands 1500", () => {
    expect(Number(normalizeInput("1,500"))).toBe(1500);
  });

  it("parses 1,234,567 as 1234567", () => {
    expect(Number(normalizeInput("1,234,567"))).toBe(1234567);
  });

  it("rejects ambiguous mixed dot+comma 1.234,56 instead of guessing", () => {
    // European "1.234,56" (=1234.56) vs "1.23456" is not decidable without locale — reject.
    expect(parseOf("geo_sq", { s: "1.234,56" }).error).toBe(ERR.invalidInput);
  });
});

describe("formula results", () => {
  it("tan(90 deg) is Infinity, not a huge finite number", () => {
    const f = getFormulaById("trig_sin")!;
    const r = f.fn({ deg: 90 });
    const tan = (r as Record<string, number>).tan;
    expect(Number.isFinite(tan)).toBe(false);
  });
});

describe("chk division-by-zero guards", () => {
  it("biz_breakeven with price == variable cost is rejected", () => {
    expect(parseOf("biz_breakeven", { fc: "100", p: "5", vc: "5" }).error).toBe(ERR.divByZero);
  });
});

describe("formatNum", () => {
  it("NaN renders as an em dash, not Infinity", () => {
    expect(formatNum(NaN)).toBe("—");
  });

  it("Infinity renders as Infinity", () => {
    expect(formatNum(Infinity)).toBe("Infinity");
  });
});
