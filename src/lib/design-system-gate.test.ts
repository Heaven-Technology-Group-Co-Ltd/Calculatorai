import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

function collectFiles(dir: string, matchesPath: (path: string) => boolean): string[] {
  let filePaths: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      filePaths.push(...collectFiles(full, matchesPath));
    } else if (matchesPath(full)) {
      filePaths.push(full);
    }
  }
  return filePaths;
}

function staticExpression(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return staticExpression(node.expression);
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return true;
  if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return true;
  if (ts.isObjectLiteralExpression(node)) return node.properties.every((property) => ts.isPropertyAssignment(property) && staticExpression(property.initializer));
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => staticExpression(element));
  return false;
}

function containsStaticJsxStyle(filePath: string): boolean {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hasStaticStyle = false;
  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === "style" && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const styleValue = ts.isAsExpression(node.initializer.expression) ? node.initializer.expression.expression : node.initializer.expression;
      if (ts.isObjectLiteralExpression(styleValue) && styleValue.properties.some((property) => ts.isPropertyAssignment(property) && staticExpression(property.initializer))) hasStaticStyle = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return hasStaticStyle;
}

describe("Design System Quality Gates", () => {
  it("G8 (Token-first): no raw hex in any CSS file other than globals.css", () => {
    const cssFiles = collectFiles("src", (filePath) => filePath.endsWith(".css") && !filePath.endsWith("globals.css"));
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
    const dialogFiles = collectFiles("src/components", (filePath) => {
      if (!filePath.endsWith(".tsx") || filePath.endsWith(".test.tsx")) return false;
      const content = readFileSync(filePath, "utf8");
      return content.includes('role="dialog"') || content.includes("<dialog");
    });
    expect(dialogFiles.length).toBe(7);
    expect(readFileSync("src/hooks/useDialog.ts", "utf8")).toContain("dialog.showModal()");

    for (const filePath of dialogFiles) {
      const content = readFileSync(filePath, "utf8");
      expect(content, `${filePath} must use <dialog>`).toContain("<dialog");
      expect(content, `${filePath} must not use div role="dialog"`).not.toMatch(/<div[^>]*role=["']dialog["']/);
      expect(content, `${filePath} must use the native dialog lifecycle`).toContain("useDialog(");
      expect(content, `${filePath} must attach the lifecycle ref`).toContain("ref={dialogRef}");
      expect(content, `${filePath} must attach dialog event handlers`).toContain("{...dialogProps}");
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

  it("forbids raw hex and rgba colors in CSS Modules", () => {
    const modules = collectFiles("src", (filePath) => filePath.endsWith(".module.css"));
    const violations = modules.filter((filePath) => /#[\da-f]{3,8}\b|rgba\s*\(/i.test(readFileSync(filePath, "utf8")));
    expect(violations).toEqual([]);
  });

  it("allows important declarations only in the reduced-motion reset", () => {
    const modules = collectFiles("src", (filePath) => filePath.endsWith(".module.css"));
    const moduleViolations = modules.filter((filePath) => readFileSync(filePath, "utf8").includes("!important"));
    const globals = readFileSync("src/app/globals.css", "utf8");
    const reducedMotion = globals.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(moduleViolations).toEqual([]);
    expect(reducedMotion).toContain("!important");
    expect(globals.replace(reducedMotion, "")).not.toContain("!important");
  });

  it("keeps status colors on the Ursa semantic palette", () => {
    const sourceFiles = collectFiles("src", (filePath) => /\.(css|ts|tsx)$/.test(filePath));
    const combinedSource = sourceFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
    const legacyChannels = [
      ["239", "68", "68"], ["16", "185", "129"], ["245", "158", "11"],
      ["34", "197", "94"], ["234", "179", "8"], ["251", "113", "133"],
    ];
    const patterns = legacyChannels.map((digits) => {
      const channels = digits.map(Number);
      const rgb = channels.join("\\s*,\\s*");
      const hex = channels.map((channel) => channel.toString(16).padStart(2, "0")).join("");
      return new RegExp(`(?:rgba?\\(\\s*${rgb}(?:\\s*,|\\s*\\))|#${hex})`, "i");
    });
    for (const pattern of patterns) expect(combinedSource).not.toMatch(pattern);
  });

  it("requires CSS Modules to use the Ursa type scale", () => {
    const modules = collectFiles("src", (filePath) => filePath.endsWith(".module.css"));
    const combinedCss = modules.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
    const declarations = [...combinedCss.matchAll(/font-size\s*:\s*([^;}]+)/g)].map((match) => match[1].trim());
    const validDeclaration = /^(?:var\(--fs-[\w-]+\)|inherit)$/;
    expect(declarations.filter((declaration) => !validDeclaration.test(declaration))).toEqual([]);
    for (let step = 1; step <= 6; step += 1) expect(combinedCss).toContain(`var(--fs-${step})`);
  });

  it("limits CSS Module breakpoints to approved widths", () => {
    const modules = collectFiles("src", (filePath) => filePath.endsWith(".module.css"));
    for (const filePath of modules) {
      const source = readFileSync(filePath, "utf8");
      const widths = [...source.matchAll(/@media\s*\([^)]*(?:max|min)-width\s*:\s*(\d+)px\)/g)].map((match) => Number(match[1]));
      for (const width of widths) {
        const approved = [640, 900, 1200].includes(width) || (width === 1600 && filePath.replaceAll("\\", "/").endsWith("components/formulas/FormulaGrid.module.css"));
        expect(approved, `${filePath} uses an unapproved breakpoint: ${width}px`).toBe(true);
      }
    }
  });

  it("requires transition tokens throughout CSS Modules", () => {
    const modules = collectFiles("src", (filePath) => filePath.endsWith(".module.css"));
    for (const filePath of modules) {
      const source = readFileSync(filePath, "utf8");
      const declarations = [...source.matchAll(/(?:^|[;{}])\s*transition(?:-[\w-]+)?\s*:\s*([^;{}]+);/g)].map((match) => match[1]);
      for (const declaration of declarations) {
        expect(declaration).toMatch(/(?:var\(--transition-[\w-]+\)|\bnone\b)/);
      }
      const autofillRule = /[^{}]*autofill[^{}]*\{[^}]*5000s[^}]*\}/gi;
      expect(source.replace(autofillRule, "")).not.toMatch(/transition[^:]*:[^;{}]*\d+(?:\.\d+)?(?:ms|s)/i);
    }
  });

  it("keeps static JSX styling in component CSS Modules", () => {
    const componentFiles = collectFiles("src", (filePath) => filePath.endsWith(".tsx") && !filePath.endsWith(".test.tsx"));
    expect(componentFiles.filter(containsStaticJsxStyle)).toEqual([]);
  });

  it("guards both responsive shells before calling matchMedia", () => {
    for (const filePath of ["src/components/AppShell.tsx", "src/components/dashboard/DashboardShell.tsx"]) {
      const source = readFileSync(filePath, "utf8");
      expect(source).toMatch(/typeof window === "undefined"\s*\|\|\s*typeof window\.matchMedia !== "function"/);
    }
  });
});
