import { describe, expect, it } from "vitest";
import { computePercentages } from "./percentages";

describe("computePercentages", () => {
  it("allocates remainders without a negative tablet share", () => {
    expect(computePercentages({ desktop: 506, mobile: 496, tablet: 0 })).toEqual({ desktop: 50, mobile: 50, tablet: 0 });
  });
  it("returns zero shares when there are no devices", () => {
    expect(computePercentages({ desktop: 0, mobile: 0, tablet: 0 })).toEqual({ desktop: 0, mobile: 0, tablet: 0 });
  });
});
