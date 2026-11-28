import { describe, expect, it } from "vitest";
import { formulas, getFormulaById } from "./registry";

describe("net present value catalog", () => {
  it("shows one NPV entry while retaining the legacy formula lookup", () => {
    expect(formulas.filter((formula) => /net present value/i.test(formula.title.en))).toHaveLength(1);
    const legacy = getFormulaById("fi_npv");
    expect(legacy?.fn({ Ct: 110, r: 10, t: 1, C0: 50 })).toBeCloseTo(50);
    expect(getFormulaById("biz_npv")).toBeDefined();
  });
});
