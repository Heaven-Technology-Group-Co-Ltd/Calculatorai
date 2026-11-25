import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, filter: (f: string) => boolean): string[] {
  let res: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      res.push(...walk(full, filter));
    } else if (filter(full)) {
      res.push(full);
    }
  }
  return res;
}

describe("Design System Quality Gates", () => {
  it("G8 (Token-first): no raw hex in any CSS file other than globals.css", () => {
    const cssFiles = walk("src", (f) => f.endsWith(".css") && !f.endsWith("globals.css"));
    const violations: string[] = [];

    for (const file of cssFiles) {
      const content = readFileSync(file, "utf8");
      const hexMatches = [...content.matchAll(/#([0-9a-fA-F]{3,8})\b/g)];
      if (hexMatches.length > 0) {
        violations.push(`${file}: ${hexMatches.map((m) => m[0]).join(", ")}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("G10 (Dialog Semantics): all dialog surfaces use native <dialog> with showModal and 0 div dialogs", () => {
    const dialogFiles = walk("src/components", (f) => {
      if (!f.endsWith(".tsx")) return false;
      const content = readFileSync(f, "utf8");
      return content.includes('role="dialog"') || content.includes("<dialog");
    });
    expect(dialogFiles.length).toBe(9);

    for (const file of dialogFiles) {
      const content = readFileSync(file, "utf8");
      expect(content, `${file} must use <dialog>`).toContain("<dialog");
      expect(content, `${file} must not use div role="dialog"`).not.toMatch(/<div[^>]*role=["']dialog["']/);
      expect(content, `${file} must invoke showModal()`).toContain("showModal");
    }
  });

  it("globals.css defines 6-step type scale and 5-tier z-index scale", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    for (let i = 1; i <= 6; i++) {
      expect(globals).toContain(`--fs-${i}:`);
    }
    for (const z of ["--z-base", "--z-sticky", "--z-drawer", "--z-modal", "--z-toast"]) {
      expect(globals).toContain(`${z}:`);
    }
  });
});
