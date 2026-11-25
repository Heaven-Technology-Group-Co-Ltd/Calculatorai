import { describe, it, expect } from "vitest";
import { departments } from "@/lib/math-data";
import { formulas } from "@/lib/formulas/registry";

describe("Department filter taxonomy (F-12)", () => {
  it("has exactly 11 active departments and 12 empty departments", () => {
    const active = departments.filter((d) =>
      formulas.some((f) => (d.subjects || []).includes(f.subject))
    );
    const empty = departments.filter(
      (d) => !formulas.some((f) => (d.subjects || []).includes(f.subject))
    );

    expect(active.length).toBe(11);
    expect(empty.length).toBe(12);
    expect(departments.length).toBe(23);
  });

  it("identifies exactly 25 unmapped formulas for dev review", () => {
    const allMappedSubjects = new Set(departments.flatMap((d) => d.subjects));
    const unmapped = formulas.filter((f) => !allMappedSubjects.has(f.subject));
    expect(unmapped.length).toBe(25);
  });
});
