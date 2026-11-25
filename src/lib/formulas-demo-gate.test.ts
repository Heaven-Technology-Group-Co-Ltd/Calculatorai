import { describe, expect, it } from "vitest";
import { isFormulasDemoEnabled } from "./formulas-demo-gate";

describe("formulas-demo gate", () => {
  it("serves the demo in development regardless of the flag", () => {
    expect(isFormulasDemoEnabled("development", undefined)).toBe(true);
    expect(isFormulasDemoEnabled("development", "false")).toBe(true);
  });

  it("blocks the demo in production without the flag", () => {
    expect(isFormulasDemoEnabled("production", undefined)).toBe(false);
    expect(isFormulasDemoEnabled("production", "")).toBe(false);
    expect(isFormulasDemoEnabled("production", "false")).toBe(false);
    expect(isFormulasDemoEnabled("production", "1")).toBe(false);
  });

  it("serves the demo in production only with the exact flag value", () => {
    expect(isFormulasDemoEnabled("production", "true")).toBe(true);
  });
});
