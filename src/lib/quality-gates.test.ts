
function parseGlobalsTokens(css: string): Record<string, string> {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch) throw new Error("No :root block found in globals.css");
  const body = rootMatch[1];
  const tokens: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("--")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).replace(/;.*$/, "").trim();
    tokens[key] = val;
  }
  return tokens;
}

function parseColorValue(str: string): [number, number, number, number] | null {
  const s = str.trim();
  const hex = s.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hex) {
    const h = hex[1];
    if (h.length === 6) {
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1.0];
    }
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 1.0];
    }
  }
  const rgba = s.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (rgba) {
    return [
      parseFloat(rgba[1]),
      parseFloat(rgba[2]),
      parseFloat(rgba[3]),
      rgba[4] !== undefined ? parseFloat(rgba[4]) : 1.0,
    ];
  }
  return null;
}

function resolveTokenValue(name: string, tokens: Record<string, string>): string {
  let val = tokens[name];
  if (!val) return "";
  let loops = 0;
  while (val.includes("var(") && loops < 10) {
    val = val.replace(/var\((--[a-zA-Z0-9_-]+)\)/g, (_, ref) => tokens[ref] || "");
    loops++;
  }
  return val.trim();
}

function compositeFg(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
  const a = fg[3];
  return [
    Math.round(fg[0] * a + bg[0] * (1.0 - a)),
    Math.round(fg[1] * a + bg[1] * (1.0 - a)),
    Math.round(fg[2] * a + bg[2] * (1.0 - a)),
  ];
}

function rgbLum(rgb: [number, number, number]): number {
  return 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
}

function calcContrast(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = rgbLum(fg);
  const l2 = rgbLum(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, resolve, dirname, relative } from "node:path";

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

// WCAG 2.2 relative luminance & contrast ratio calculation
function srgb(c: number): number {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

describe("CI Guardrails & Quality Gates (G8-G11)", () => {
  // ── G8: Token-first ──
  it("G8 (Token-first): 0 raw hex in CSS, no legacy pink in globals, and core TSX adheres to tokens", () => {
    // 1. Non-globals CSS: 0 raw hex
    const cssFiles = walk("src", (f) => f.endsWith(".css") && !f.endsWith("globals.css"));
    const cssViolations: string[] = [];

    for (const file of cssFiles) {
      const content = readFileSync(file, "utf8");
      const hexMatches = [...content.matchAll(/#([0-9a-fA-F]{3,8})\b/g)];
      if (hexMatches.length > 0) {
        cssViolations.push(`${file}: ${hexMatches.map((m) => m[0]).join(", ")}`);
      }
    }
    expect(cssViolations, "No non-globals CSS may contain raw hex colors").toEqual([]);

    // 2. globals.css must not contain legacy pink
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).not.toContain("#FF2F92");
    expect(globals).not.toContain("255, 47, 146");

    // 3. Core UI pages & error boundaries must not contain raw hex
    const coreUiFiles = walk("src/app", (f) => f.endsWith(".tsx") && !f.includes("formulas-demo") && !f.includes("status"));
    const tsxViolations: string[] = [];
    for (const file of coreUiFiles) {
      const content = readFileSync(file, "utf8");
      const hexMatches = [...content.matchAll(/#([0-9a-fA-F]{3,8})\b/g)];
      if (hexMatches.length > 0) {
        tsxViolations.push(`${file}: ${hexMatches.map((m) => m[0]).join(", ")}`);
      }
    }
    expect(tsxViolations, "Core UI pages & error boundary must not contain raw hex").toEqual([]);

    // 4. Non-globals CSS: raw rgb()/rgba() cannot exceed the ratchet baseline.
    //    Baseline 202 = re-measured 2026-10-24 at audit v3 loop F (the old 203
    //    left one slot of slack, so a single new literal passed); may only decrease.
    const rgbRatchetFiles: string[] = [];
    let rawRgbCount = 0;
    for (const file of cssFiles) {
      const content = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
      const count = [...content.matchAll(/rgba?\(/g)].length;
      if (count > 0) rgbRatchetFiles.push(`${file}: ${count}`);
      rawRgbCount += count;
    }
    const RAW_RGB_BASELINE = 202;
    expect(
      rawRgbCount,
      `Raw rgb()/rgba() in non-globals CSS (${rawRgbCount}) exceeded ratchet baseline (${RAW_RGB_BASELINE}): ${rgbRatchetFiles.join(", ")}`
    ).toBeLessThanOrEqual(RAW_RGB_BASELINE);
    // 5. Component TSX: raw hex cannot exceed the per-file ratchet baseline (down-only).
    const COMPONENT_HEX_BASELINES: Record<string, number> = {
      "src/components/dashboard/blocks/DevicePieChart.tsx": 6,
      "src/components/dashboard/blocks/GeographyList.tsx": 1,
      "src/components/dashboard/blocks/PlanBreakdown.tsx": 4,
      "src/components/dashboard/blocks/RevenueChart.tsx": 2,
      "src/components/dashboard/blocks/TrafficAreaChart.tsx": 4,
      "src/components/dashboard/pages/UsersPage.tsx": 1,
      "src/components/dashboard/tables/RefundTable.tsx": 1,
      "src/components/login/LoginClient.tsx": 5,
      "src/components/signup/SignUpClient.tsx": 4,
    };

    const componentFiles = walk("src/components", (f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test."));
    const componentHexViolations: string[] = [];

    for (const f of componentFiles) {
      const normPath = f.replace(/\\/g, "/");
      const content = readFileSync(f, "utf8");
      const hexCount = [...content.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].length;
      const baseline = COMPONENT_HEX_BASELINES[normPath] ?? 0;
      if (hexCount > baseline) {
        componentHexViolations.push(`${normPath}: ${hexCount} raw hex matches (exceeds baseline ${baseline})`);
      }
    }

    expect(
      componentHexViolations,
      `Raw hex in src/components exceeded per-file ratchet baseline: ${componentHexViolations.join("; ")}`
    ).toEqual([]);

    // 6. src/app + src/lib TS/TSX: per-file ratchet (down-only), default 0.
    //    Extension from the src/components ratchet — a hex literal dropped in
    //    any other lib or app file used to go unnoticed (HANDOFF AUDIT #3 M3).
    const APP_LIB_HEX_BASELINES: Record<string, number> = {
      "src/lib/math-data.ts": 27,
      "src/app/status/constants.ts": 5,
      "src/app/api/auth/register/route.ts": 7,
      "src/app/api/auth/forgot-password/route.ts": 7,
      "src/app/status/StatusClient.tsx": 5,
      "src/app/status/components/Charts.tsx": 4,
      "src/lib/payment-data.ts": 2,
      "src/app/formulas-demo/FormulasDemoClient.tsx": 2,
      "src/app/status/components/KPIBar.tsx": 1,
      "src/app/api/stats/route.ts": 1,
    };

    const appLibFiles = walk("src/app", (f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test."))
      .concat(walk("src/lib", (f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test.")));
    const appLibHexViolations: string[] = [];

    for (const f of appLibFiles) {
      const normPath = f.replace(/\\/g, "/");
      const content = readFileSync(f, "utf8");
      const hexCount = [...content.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].length;
      const baseline = APP_LIB_HEX_BASELINES[normPath] ?? 0;
      if (hexCount > baseline) {
        appLibHexViolations.push(`${normPath}: ${hexCount} raw hex matches (exceeds baseline ${baseline})`);
      }
    }

    expect(
      appLibHexViolations,
      `Raw hex in src/app/src/lib exceeded per-file ratchet baseline: ${appLibHexViolations.join("; ")}`
    ).toEqual([]);
  });

  // ── G9: Contrast Budget (WCAG 2.2 AA) ──
  it("G9 (Contrast Budget): design tokens pass WCAG 2.2 AA contrast ratios", () => {
    const globalsCss = readFileSync("src/app/globals.css", "utf8");
    const rawTokens = parseGlobalsTokens(globalsCss);

    // Single source of truth backgrounds parsed directly from globals.css
    const surfaceHex = resolveTokenValue("--surface", rawTokens);
    const surfaceRgb = parseColorValue(surfaceHex)!.slice(0, 3) as [number, number, number];

    const bgRgb = parseColorValue(resolveTokenValue("--bg", rawTokens))!.slice(0, 3) as [number, number, number];
    const sidebarRgb = parseColorValue(resolveTokenValue("--sidebar-bg", rawTokens))!.slice(0, 3) as [number, number, number];

    const rawCardBg = parseColorValue(resolveTokenValue("--card-bg", rawTokens))!;
    const cardBgRgb = compositeFg(rawCardBg, surfaceRgb);

    const backgrounds: [string, [number, number, number]][] = [
      ["--bg", bgRgb],
      ["--surface", surfaceRgb],
      ["--sidebar-bg", sidebarRgb],
      ["--card-bg", cardBgRgb],
    ];

    // Text tokens that must meet WCAG 2.2 AA normal text (>= 4.5:1)
    // --status-unknown renders as status label text (.serviceStatus reads
    // --status-color), so it is held to the same bar as the text tokens.
    const textTokenNames = ["--text", "--text-secondary", "--info", "--status-unknown"];

    for (const tokenName of textTokenNames) {
      const resolved = resolveTokenValue(tokenName, rawTokens);
      const parsedColor = parseColorValue(resolved);
      expect(parsedColor, `Token ${tokenName} must be a valid color in globals.css`).not.toBeNull();

      for (const [bgName, bgVal] of backgrounds) {
        const composited = compositeFg(parsedColor!, bgVal);
        const cr = calcContrast(composited, bgVal);
        expect(
          cr,
          `Contrast ${tokenName} (${resolved}) on ${bgName} (${cr.toFixed(2)}:1) must be >= 4.5:1`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }

    // Status colors (used as text on cards too — .serviceStatus, .incidentBadge):
    // >= 4.5:1 on every background surface, not only --bg.
    const statusTokenNames = ["--primary", "--success", "--error", "--warning", "--info"];
    for (const tokenName of statusTokenNames) {
      const resolved = resolveTokenValue(tokenName, rawTokens);
      const parsedColor = parseColorValue(resolved);
      expect(parsedColor, `Token ${tokenName} must be a valid color in globals.css`).not.toBeNull();
      for (const [bgName, bgVal] of backgrounds) {
        const composited = compositeFg(parsedColor!, bgVal);
        const cr = calcContrast(composited, bgVal);
        expect(
          cr,
          `Status token ${tokenName} (${resolved}) on ${bgName} (${cr.toFixed(2)}:1) must be >= 4.5:1`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }

    // UI focus indicator / interactive elements: WCAG AA non-text >= 3.0:1 across backgrounds
    const primaryColor = parseColorValue(resolveTokenValue("--primary", rawTokens))!;
    for (const [bgName, bgVal] of backgrounds) {
      const composited = compositeFg(primaryColor, bgVal);
      const uiRatio = calcContrast(composited, bgVal);
      expect(
        uiRatio,
        `UI focus indicator --primary on ${bgName} (${uiRatio.toFixed(2)}:1) must be >= 3.0:1`
      ).toBeGreaterThanOrEqual(3.0);
    }
  });

  // ── G10: Dialog Semantics ──
  it("G10 (Dialog Semantics): all dialog surfaces use native <dialog> with showModal and 0 div dialogs", () => {
    const dialogFiles = walk("src/components", (f) => {
      if (!f.endsWith(".tsx") || f.endsWith(".test.tsx")) return false;
      const content = readFileSync(f, "utf8");
      return content.includes('role="dialog"') || content.includes("<dialog");
    });

    expect(dialogFiles.length).toBe(7);
    expect(readFileSync("src/hooks/useDialog.ts", "utf8")).toContain("dialog.showModal()");

    for (const file of dialogFiles) {
      const content = readFileSync(file, "utf8");
      expect(content, `${file} must use native <dialog>`).toContain("<dialog");
      expect(content, `${file} must not fake dialog semantics on a <div>`).not.toMatch(/<div[^>]*role=["']dialog["']/);
      expect(content, `${file} must use the native dialog lifecycle`).toContain("useDialog(");
      expect(content, `${file} must attach the lifecycle ref`).toContain("ref={dialogRef}");
      expect(content, `${file} must attach dialog event handlers`).toContain("{...dialogProps}");
      expect(content, `${file} must not contain modal-overlay`).not.toContain('className="modal-overlay"');
      expect(content, `${file} must not contain styles.sheetOverlay`).not.toContain("styles.sheetOverlay");
    }
  });

  // ── G11: Dead-class Ratchet (locked at 0) ──
  it("G11 (Dead-class Ratchet): unused CSS classes cannot exceed baseline ratchet (0)", () => {
    function stripCodeComments(src: string): string {
      return src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/gm, " ")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
    }

    // Global classes are referenced as plain strings — className attributes,
    // template-literal statics, ternary branches, classList calls. Identifiers
    // (function names, object keys) must NOT count as usage: the old bare-word
    // corpus let a dead global class named like any identifier pass (e.g.
    // `.session` matched the useSession variable). HANDOFF AUDIT #3 item 0i.
    function collectGlobalClassUsage(src: string): string {
      const chunks: string[] = [];
      for (const m of src.matchAll(/className\s*=\s*(["'])([^"'{}]*)\1/g)) chunks.push(m[2]);
      const exprRe = /className\s*=\s*\{/g;
      let em: RegExpExecArray | null;
      while ((em = exprRe.exec(src)) !== null) {
        let depth = 1;
        let k = em.index + em[0].length;
        while (k < src.length && depth) {
          if (src[k] === "{") depth++;
          else if (src[k] === "}") depth--;
          k++;
        }
        const expr = src.slice(em.index + em[0].length, k - 1);
        for (const t of expr.matchAll(/`(?:[^`\\]|\\.)*`/g)) chunks.push(t[0]);
        for (const q of expr.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)) chunks.push(q[0]);
      }
      for (const c of src.matchAll(/classList\.\w+\(\s*(["'`])([^"'`]*)\1/g)) chunks.push(c[2]);
      return chunks.join(" ");
    }

    const moduleCssFiles = walk("src", (f) => f.endsWith(".module.css"));
    const allTsx = walk("src", (f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    let tsxCorpus = "";
    let globalUsageCorpus = "";
    for (const t of allTsx) {
      const clean = stripCodeComments(readFileSync(t, "utf8"));
      tsxCorpus += " " + clean;
      globalUsageCorpus += " " + collectGlobalClassUsage(clean);
    }

    let unusedCount = 0;
    const unusedList: string[] = [];

    const cssScopes: { label: string; content: string; isGlobal: boolean }[] = moduleCssFiles.map((mFile) => ({
      label: `${basename(mFile)}`,
      content: stripCodeComments(readFileSync(mFile, "utf8")).replace(/:global\([^)]+\)/g, " "),
      isGlobal: false,
    }));
    cssScopes.push({ label: "globals.css", content: stripCodeComments(readFileSync("src/app/globals.css", "utf8")), isGlobal: true });

    for (const scope of cssScopes) {
      const matches = [...scope.content.matchAll(/(?:^|[\s,}{>+~])\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((m) => m[1]);
      const unique = Array.from(new Set(matches));
      const usageCorpus = scope.isGlobal ? globalUsageCorpus : tsxCorpus;

      for (const cls of unique) {
        if (["collapsed", "active", "open"].includes(cls)) continue;
        const refRegex = new RegExp(`\\b${cls}\\b`);
        if (!refRegex.test(usageCorpus)) {
          unusedCount++;
          unusedList.push(`${scope.label}: .${cls}`);
        }
      }
    }

    // Baseline ratchet locked at 0 — no dead classes allowed
    const MAX_ALLOWED_UNUSED = 0;
    expect(
      unusedCount,
      `Unused CSS classes (${unusedCount}) exceeded baseline ratchet (${MAX_ALLOWED_UNUSED}): ${unusedList.join(", ")}`
    ).toBeLessThanOrEqual(MAX_ALLOWED_UNUSED);
  });

  // ── Page Metadata Coverage ──
  it("Page Metadata: all 10 main app pages declare export const metadata with unique titles", () => {
    const pageFiles = walk("src/app", (f) => basename(f) === "page.tsx");
    expect(pageFiles.length, "Must find exactly 10 route pages").toBe(10);

    const titles = new Set<string>();

    for (const p of pageFiles) {
      const content = readFileSync(p, "utf8");
      expect(content, `${p} must export metadata`).toContain("export const metadata");
      const match = content.match(/title:\s*["'`](.+?)["'`]/);
      expect(match, `${p} must declare a metadata title`).toBeTruthy();
      const title = match![1];
      expect(titles.has(title), `Duplicate page title found in ${p}: "${title}"`).toBe(false);
      titles.add(title);
    }

    expect(titles.size).toBe(10);
  });

  // ── Global A11y (Focus-Visible & Reduced-Motion) ──
  it("Global A11y: globals.css defines :focus-visible and prefers-reduced-motion", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).toContain(":focus-visible");
    expect(globals).toContain("prefers-reduced-motion");
  });

  // ── G12: Type-scale Ratchet (per-file baseline, D3) ──
  it("G12 (Type-scale Ratchet): literal font-sizes in module CSS cannot exceed per-file baseline", () => {
    const FILE_BASELINES: Record<string, number> = {
      "src/app/status/StatusClient.module.css": 30,
      "src/components/AppShell.module.css": 0,
      "src/components/AuthButton.module.css": 0,
      "src/components/ConfirmModal.module.css": 0,
      "src/components/dashboard/styles/dashboard-blocks.module.css": 31,
      "src/components/dashboard/styles/dashboard-modals.module.css": 12,
      "src/components/dashboard/styles/dashboard-settings.module.css": 7,
      "src/components/dashboard/styles/dashboard-shell.module.css": 10,
      "src/components/dashboard/styles/dashboard-tables.module.css": 10,
      "src/components/features/history/HistorySidebar.module.css": 7,
      "src/components/features/info/InfoModal.module.css": 5,
      "src/components/features/language/LanguageDropdown.module.css": 1,
      "src/components/features/loading/LoadingScreen.module.css": 6,
      "src/components/formulas/FormulaCard.module.css": 7,
      "src/components/formulas/FormulaGrid.module.css": 0,
      "src/components/LevelFilter.module.css": 1,
      "src/components/LevelTabs.module.css": 1,
      "src/components/login/Login.module.css": 27,
      "src/components/not-found/NotFound.module.css": 26,
      "src/components/purchase/Purchase.module.css": 30,
      "src/components/purchase/PurchaseSuccess.module.css": 7,
      "src/components/ResetPassword.module.css": 11,
      "src/components/sidebar/SidebarFooter.module.css": 0,
      "src/components/sidebar/SidebarNavItem.module.css": 0,
      "src/components/sidebar/SidebarSection.module.css": 2,
      "src/components/Sidebar.module.css": 7,
      "src/components/signup/SignUp.module.css": 34,
      "src/components/verify/Verify.module.css": 20,
    };

    const moduleCssFiles = walk("src", (f) => f.endsWith(".module.css"));
    const violations: string[] = [];

    for (const f of moduleCssFiles) {
      const normalizedPath = f.replace(/\\/g, "/");
      const content = readFileSync(f, "utf8");
      const matches = [...content.matchAll(/font-size\s*:\s*([^;{}]+)/g)];
      let literalCount = 0;
      for (const m of matches) {
        const val = m[1].trim();
        if (!val.startsWith("var(--fs-")) {
          literalCount++;
        }
      }
      const baseline = FILE_BASELINES[normalizedPath] ?? 0;
      if (literalCount > baseline) {
        violations.push(`${normalizedPath}: has ${literalCount} literals (exceeds baseline ${baseline})`);
      }
    }

    expect(violations, `Literal font-size exceeded baseline: ${violations.join("; ")}`).toEqual([]);

    // Scope extension (audit v3 loop F, item R-7): the per-file table above only
    // sees module CSS (292 literals measured 2026-10-24) while scripts/v3/
    // measure.py counts every CSS literal under src (341). The 49 difference is
    // src/app/globals.css, and inline `fontSize:` styles in TS/TSX (47) were
    // invisible to any gate. Both are ratcheted down-only at today's count.
    const GLOBALS_FONT_LITERAL_BASELINE = 49;
    const INLINE_FONT_SIZE_BASELINE = 47;

    const globalsLiterals = [...readFileSync("src/app/globals.css", "utf8").matchAll(/font-size\s*:\s*([^;{}]+)/g)]
      .filter((m) => !m[1].trim().startsWith("var(--fs-")).length;
    expect(
      globalsLiterals,
      `globals.css literal font-sizes (${globalsLiterals}) exceeded ratchet baseline (${GLOBALS_FONT_LITERAL_BASELINE})`
    ).toBeLessThanOrEqual(GLOBALS_FONT_LITERAL_BASELINE);

    let inlineLiterals = 0;
    const inlineOffenders: string[] = [];
    for (const f of walk("src", (x) => (x.endsWith(".tsx") || x.endsWith(".ts")) && !x.includes(".test."))) {
      const count = [...readFileSync(f, "utf8").matchAll(/fontSize\s*:\s*(?!["'`]?var\()/g)].length;
      if (count > 0) { inlineLiterals += count; inlineOffenders.push(`${f.replace(/\\/g, "/")}:${count}`); }
    }
    expect(
      inlineLiterals,
      `Inline fontSize literals in TS/TSX (${inlineLiterals}) exceeded ratchet baseline (${INLINE_FONT_SIZE_BASELINE}): ${inlineOffenders.join(", ")}`
    ).toBeLessThanOrEqual(INLINE_FONT_SIZE_BASELINE);
  });

  // ── G13: Dialog Display Scoping ──
  it("G13 (Dialog Display Scoping): dialog base selectors cannot define display without [open]", () => {
    const dialogFiles = walk("src/components", (f) => {
      if (!f.endsWith(".tsx") || f.endsWith(".test.tsx")) return false;
      const c = readFileSync(f, "utf8");
      return c.includes("<dialog");
    });

    const dialogCssPairs: { file: string; classes: string[]; cssFiles: string[] }[] = [];
    for (const file of dialogFiles) {
      const c = readFileSync(file, "utf8");
      const matches = [...c.matchAll(/<dialog[^>]*>/g)];
      const classes = new Set<string>();
      for (const m of matches) {
        const clsAttr = m[0].match(/className=\{?["'`]?([^"'`}>]+)/);
        if (clsAttr) {
          const parts = clsAttr[1].split(/[\s${}`]+/);
          for (const p of parts) {
            const clean = p.replace(/^styles\./, "").replace(/[^a-zA-Z0-9_-]/g, "");
            if (clean) classes.add(clean);
          }
        }
      }

      const importMatches = [...c.matchAll(/import\s+(?:styles\s+from\s+)?["']([^"']+\.css)["']/g)];
      const cssPaths = importMatches.map((m) => resolve(dirname(file), m[1]));
      cssPaths.push(resolve("src/app/globals.css"));

      dialogCssPairs.push({
        file,
        classes: Array.from(classes),
        cssFiles: cssPaths,
      });
    }

    const violations: string[] = [];
    for (const pair of dialogCssPairs) {
      for (const cssFile of pair.cssFiles) {
        if (!existsSync(cssFile)) continue;
        const rawContent = readFileSync(cssFile, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
        const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
        let m;
        while ((m = ruleRegex.exec(rawContent)) !== null) {
          const selector = m[1].trim();
          const body = m[2];
          if (!/display\s*:/i.test(body)) continue;

          const isDialogItself =
            selector === "dialog" ||
            selector.startsWith("dialog.") ||
            selector.includes("dialog,") ||
            selector.endsWith("dialog") ||
            pair.classes.some((cls) => {
              const lastPart = selector.split(/\s+/).pop() || "";
              return lastPart === `.${cls}` || lastPart.startsWith(`.${cls}:`) || lastPart.startsWith(`.${cls}[`);
            });

          if (isDialogItself && !/\[open\]|:open/.test(selector)) {
            const relCss = relative(process.cwd(), cssFile);
            violations.push(`${relCss} (for ${basename(pair.file)}): "${selector}" sets display without [open]`);
          }
        }
      }
    }

    expect(
      Array.from(new Set(violations)),
      `Dialog base selectors cannot define display without [open]: ${violations.join("; ")}`
    ).toEqual([]);
  });
});
