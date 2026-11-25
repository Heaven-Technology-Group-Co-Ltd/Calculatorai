import { describe, it, expect } from "vitest";
import { STATUS_LABEL, STATUS_COLOR } from "../constants";

describe("ServiceCard unknown status handling (F-13)", () => {
  it("defines unknown status label as Unknown", () => {
    expect(STATUS_LABEL.unknown).toBe("Unknown");
  });

  it("defines unknown status color as the WCAG-checked --status-unknown token", () => {
    expect(STATUS_COLOR.unknown).toBe("var(--status-unknown)");
  });
});
