import { describe, expect, it } from "vitest";
import { isBackdropClick } from "./dialog-backdrop";

describe("dialog backdrop press (R-6)", () => {
  it("closes when the press starts and ends on the dialog element itself", () => {
    expect(isBackdropClick(true, true)).toBe(true);
  });

  it("keeps the dialog open when a press starts inside the panel and ends on the backdrop (drag-selection)", () => {
    expect(isBackdropClick(false, true)).toBe(false);
  });

  it("keeps the dialog open when the click target is inside the panel", () => {
    expect(isBackdropClick(true, false)).toBe(false);
  });
});
