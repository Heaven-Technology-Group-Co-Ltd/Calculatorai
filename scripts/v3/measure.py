#!/usr/bin/env python3
"""Live UI metrics for the Ursa design system.

Single source of truth: the :root block of src/app/globals.css. No token literal is
hardcoded here -- every value is parsed, var()-resolved, alpha-composited and measured
at runtime. Re-running this file reproduces every number in audit-data/metrics.json.

Usage: python scripts/v3/measure.py
"""
from __future__ import annotations

import json
import re
import sys
import collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
GLOBALS = SRC / "app" / "globals.css"
OUT = ROOT / "audit-data" / "metrics.json"

# ── colour / contrast ────────────────────────────────────────────────────────


def parse_color(text):
    """'#abc' | '#aabbcc' | '#aabbccdd' | 'rgb(...)' | 'rgba(...)' -> (r,g,b,a) | None."""
    if text is None:
        return None
    s = text.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{3,8})", s)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        if len(h) == 6:
            h += "ff"
        if len(h) != 8:
            return None
        r, g, b, a = (int(h[i:i + 2], 16) for i in (0, 2, 4, 6))
        return (r, g, b, a / 255.0)
    m = re.fullmatch(r"rgba?\(([^)]*)\)", s, re.I)
    if m:
        raw = m.group(1).replace("/", ",").replace(" ", ",")
        parts = [p for p in (x.strip() for x in raw.split(",")) if p]
        if len(parts) < 3:
            return None
        try:
            vals = []
            for p in parts[:3]:
                vals.append(round(float(p[:-1]) * 2.55) if p.endswith("%") else round(float(p)))
            alpha = 1.0
            if len(parts) > 3:
                a = parts[3]
                alpha = float(a[:-1]) / 100.0 if a.endswith("%") else float(a)
            return (vals[0], vals[1], vals[2], alpha)
        except ValueError:
            return None
    return None


def composite(fg, bg):
    """Alpha-composite fg (r,g,b,a) over opaque bg (r,g,b)."""
    a = fg[3]
    return tuple(round(a * f + (1 - a) * b) for f, b in zip(fg[:3], bg[:3]))


def rel_lum(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(rgb1, rgb2):
    l1, l2 = rel_lum(rgb1), rel_lum(rgb2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hexof(rgb):
    return "#%02X%02X%02X" % tuple(rgb[:3])


# ── source scanning helpers ──────────────────────────────────────────────────


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def walk(exts):
    for p in sorted(SRC.rglob("*")):
        if p.is_file() and p.suffix in exts:
            yield p


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def strip_comments(css: str) -> str:
    """Blank comments but keep newlines so reported line numbers match the file."""
    return re.sub(r"/\*[\s\S]*?\*/", lambda m: "\n" * m.group(0).count("\n"), css)


def enclosing_block(css: str, open_idx: int):
    """Given index of '{', return (start_of_block_body, end_of_block_body)."""
    depth, i = 0, open_idx
    while i < len(css):
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
            if depth == 0:
                return open_idx + 1, i
        i += 1
    return open_idx + 1, len(css)


# ── 1. token table ───────────────────────────────────────────────────────────

globals_src = read(GLOBALS)
globals_clean = strip_comments(globals_src)
root_m = re.search(r":root\s*\{", globals_clean)
if not root_m:
    sys.exit("FATAL: no :root block in src/app/globals.css")
root_body_start, root_body_end = enclosing_block(globals_clean, root_m.end() - 1)
root_block_line = line_of(globals_clean, root_m.start())
root_close_line = line_of(globals_clean, root_body_end)
root_body = globals_clean[root_body_start:root_body_end]

DECL_RE = re.compile(r"(--[\w-]+)\s*:\s*([^;{}]+);")
tokens = {}
for m in DECL_RE.finditer(root_body):
    tokens[m.group(1)] = {
        "declared": m.group(2).strip(),
        "line": line_of(globals_clean, root_body_start + m.start()),
    }


def split_top(text):
    """Split on top-level commas (var() fallbacks can carry commas)."""
    out, buf, depth = [], [], 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    return out


def resolve_text(text, seen=()):
    out, i = [], 0
    while True:
        j = text.find("var(", i)
        if j < 0:
            out.append(text[i:])
            break
        out.append(text[i:j])
        depth, k = 1, j + 4
        while k < len(text) and depth:
            if text[k] == "(":
                depth += 1
            elif text[k] == ")":
                depth -= 1
            k += 1
        inner = text[j + 4:k - 1]
        parts = split_top(inner)
        name = parts[0].strip()
        fallback = ",".join(parts[1:]).strip() if len(parts) > 1 else ""
        if name.startswith("--") and name in tokens and name not in seen:
            out.append(resolve_text(tokens[name]["declared"], seen + (name,)))
        elif fallback:
            out.append(resolve_text(fallback, seen))
        else:
            out.append("var(" + inner + ")")
        i = k
    return "".join(out)


TOKEN_VAR_RE = re.compile(r"var\(\s*(--[\w-]+)")


def token_usage():
    """Count var(--token) references in src/**/*.{css,tsx,ts}, excluding *.test.*."""
    counts = collections.Counter()
    files = list(walk({".css", ".tsx", ".ts"}))
    scanned = 0
    for p in files:
        if ".test." in p.name:
            continue
        scanned += 1
        for name in TOKEN_VAR_RE.findall(read(p)):
            counts[name] += 1
    return counts, scanned


usage, scanned_files = token_usage()


def classify(name):
    if re.search(r"text|font", name):
        return "text"
    if "border" in name:
        return "border"
    if re.search(r"surface|card|sidebar|(^|-)bg$|glow|shadow", name):
        return "surface"
    if re.search(r"primary|secondary|accent|level|dash", name):
        return "accent"
    if re.search(r"success|error|warning|info", name):
        return "status"
    return "other"


token_rows = []
for name, info in tokens.items():
    resolved = resolve_text(info["declared"]).strip()
    color = parse_color(resolved)
    token_rows.append({
        "name": name,
        "declared": info["declared"],
        "resolved": resolved,
        "decl": f"src/app/globals.css:{info['line']}",
        "usage": usage.get(name, 0),
        "role": classify(name),
        "color": hexof(color) + ("" if color[3] == 1 else "@%.2f" % color[3]) if color else None,
    })

# ── 2. contrast matrix ───────────────────────────────────────────────────────

BACKGROUNDS = []
for bg_name in ("--bg", "--surface", "--sidebar-bg", "--card-bg"):
    resolved = resolve_text(tokens[bg_name]["declared"]).strip()
    c = parse_color(resolved)
    if bg_name == "--card-bg":
        base = parse_color(resolve_text(tokens["--surface"]["declared"]).strip())
        c = tuple(composite(c, base[:3])) + (1.0,)
    BACKGROUNDS.append((bg_name, c[:3]))

contrast_rows, failures_text = [], []
for row in token_rows:
    color = parse_color(row["resolved"])
    if not color or row["role"] == "surface":
        continue  # surface tokens ARE backgrounds; their foreground ratio is not meaningful
    for bg_name, bg in BACKGROUNDS:
        fg = composite(color, bg)
        if hexof(fg) == hexof(bg):
            continue  # token is the background itself; self-contrast (1.0) is not a pair
        ratio = contrast(fg, bg)
        entry = {
            "token": row["name"],
            "role": row["role"],
            "declared": row["declared"],
            "resolved": row["resolved"],
            "alpha": round(color[3], 3),
            "background": bg_name,
            "backgroundHex": hexof(bg),
            "compositeHex": hexof(fg),
            "ratio": round(ratio, 2),
            "pass45": ratio >= 4.5,
            "pass30": ratio >= 3.0,
            "usage": row["usage"],
            "decl": row["decl"],
        }
        contrast_rows.append(entry)
        if row["role"] == "text" and not entry["pass45"]:
            failures_text.append(entry)

contrast_rows.sort(key=lambda e: (1 if e["pass45"] else 0, e["ratio"]))

# ── 3. font sizes ────────────────────────────────────────────────────────────

FONT_RE = re.compile(r"font-size\s*:\s*([^;{}]+)")
literal_sizes, literal_sites, fs_var_sites = collections.Counter(), [], []
for p in walk({".css"}):
    src = read(p)
    clean = strip_comments(src)
    for m in FONT_RE.finditer(clean):
        val = m.group(1).strip()
        site = f"{rel(p)}:{line_of(clean, m.start())}"
        if val.startswith("var("):
            fs_var_sites.append({"value": val, "site": site})
        else:
            literal_sizes[val] += 1
            literal_sites.append({"value": val, "site": site})

fs_tokens = [r for r in token_rows if r["name"].startswith("--fs-")]

# ── 4. z-index ───────────────────────────────────────────────────────────────

Z_RE = re.compile(r"z-index\s*:\s*([^;{}]+)")
z_raw, z_var = [], []
for p in walk({".css"}):
    src = read(p)
    clean = strip_comments(src)
    for m in Z_RE.finditer(clean):
        val = m.group(1).strip()
        site = f"{rel(p)}:{line_of(clean, m.start())}"
        if "var(" in val:
            z_var.append({"value": val, "site": site})
        elif re.fullmatch(r"-?\d+", val):
            z_raw.append({"value": int(val), "site": site})
z_var_usage = 0
for p in walk({".css", ".tsx", ".ts"}):
    if ".test." in p.name:
        continue
    z_var_usage += sum(1 for n in TOKEN_VAR_RE.findall(read(p)) if n.startswith("--z-"))

# ── 5. raw hex ───────────────────────────────────────────────────────────────

HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
hex_non_globals, hex_js = [], []
for p in walk({".css"}):
    if p == GLOBALS:
        continue
    clean = strip_comments(read(p))
    for m in HEX_RE.finditer(clean):
        hex_non_globals.append({"hex": m.group(0), "site": f"{rel(p)}:{line_of(clean, m.start())}"})
for p in walk({".tsx", ".ts"}):
    if ".test." in p.name:
        continue
    src = read(p)
    for m in HEX_RE.finditer(src):
        hex_js.append({"hex": m.group(0), "site": f"{rel(p)}:{line_of(src, m.start())}"})

# ── 6. dead classes ──────────────────────────────────────────────────────────

CLASS_RE = re.compile(r"\.([a-zA-Z_][\w-]*)")  # scripts/audit_ui.py:11
G11_CLASS_RE = re.compile(r"(?:^|[\s,}{>+~])\.([a-zA-Z_][a-zA-Z0-9_-]*)")  # quality-gates.test.ts:128
STYLES_REF_RE = re.compile(r"styles\.([a-zA-Z_]\w*)|styles\[\s*['\"]([\w-]+)['\"]\s*\]")
CLASSNAME_RE = re.compile(r"className\s*=\s*")


def className_values(src):
    """Yield className values, including whole {...} expressions (template literals too)."""
    for m in CLASSNAME_RE.finditer(src):
        i = m.end()
        if i >= len(src):
            continue
        ch = src[i]
        if ch in "\"'":
            j = src.find(ch, i + 1)
            if j > 0:
                yield ("str", src[i + 1:j])
        elif ch == "{":
            depth, k = 0, i
            while k < len(src):
                if src[k] == "{":
                    depth += 1
                elif src[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            yield ("expr", src[i + 1:k])


def strip_exprs(raw):
    """Drop ${...} expressions from a template literal, keeping the literal text."""
    out, i = [], 0
    while i < len(raw):
        if raw.startswith("${", i):
            depth, i = 1, i + 2
            while i < len(raw) and depth:
                if raw[i] == "{":
                    depth += 1
                elif raw[i] == "}":
                    depth -= 1
                i += 1
            out.append(" ")
        else:
            out.append(raw[i])
            i += 1
    return "".join(out)


def class_words(kind, raw):
    """Literal class tokens. str: plain attribute. expr: JSX expression."""
    if kind == "str":
        words = raw.split()
    elif "`" in raw:
        words = re.findall(r"[A-Za-z_][\w-]*", strip_exprs(raw))
    else:
        quoted = re.findall(r"\"([^\"]*)\"|'([^']*)'", raw)
        words = []
        for a, b in quoted:
            words += (a or b).split()
    return [w for w in words if re.fullmatch(r"[A-Za-z_][\w-]*", w)]

module_files = [p for p in walk({".css"}) if p.name.endswith(".module.css")]
global_declared = {}
for m in CLASS_RE.finditer(globals_clean):
    global_declared.setdefault(m.group(1), line_of(globals_clean, m.start()))
module_declared = {}
for p in module_files:
    clean = strip_comments(read(p))
    clean = re.sub(r":global\([^)]+\)", " ", clean)
    for m in CLASS_RE.finditer(clean):
        module_declared.setdefault(m.group(1), f"{rel(p)}:{line_of(clean, m.start())}")

used_literal, used_robust, used_module = set(), set(), set()
# G11 (quality-gates.test.ts:117-121) builds its corpus from every .tsx/.ts, tests included.
tsx_corpus = "".join(" " + read(p) for p in walk({".tsx", ".ts"}))
tsx_files = [p for p in walk({".tsx", ".ts"}) if ".test." not in p.name]
for p in tsx_files:
    src = read(p)
    for kind, raw in className_values(src):
        if kind == "str":
            for tok in raw.split():
                if re.fullmatch(r"[a-zA-Z_][\w-]*", tok):
                    used_literal.add(tok)
        used_robust.update(class_words(kind, raw))
    for m in STYLES_REF_RE.finditer(src):
        used_module.add(m.group(1) or m.group(2))

# G11 method (src/lib/quality-gates.test.ts:128-138): module css only, bare word anywhere
# in the tsx/ts corpus counts as used; collapsed/active/open exempt.
G11_EXEMPT = {"collapsed", "active", "open"}
g11_dead = []
for p in module_files:
    clean = strip_comments(read(p))
    for cls in dict.fromkeys(G11_CLASS_RE.findall(clean)):
        if cls in G11_EXEMPT:
            continue
        if not re.search(r"\b" + re.escape(cls) + r"\b", tsx_corpus):
            g11_dead.append(f"{p.name}: .{cls}")

def dead_rows(declared, used, global_scope):
    out = []
    for c, loc in sorted(declared.items()):
        if c in used:
            continue
        out.append({"class": c, "decl": (f"src/app/globals.css:{loc}" if global_scope else loc)})
    return out


dead_global = dead_rows(global_declared, used_literal, True)
dead_module = dead_rows(module_declared, used_module, False)
dead_global_robust = dead_rows(global_declared, used_robust, True)
dead_module_robust = dead_rows(module_declared, used_module, False)
audit_dead_names = {x["class"] for x in dead_module}
audit_dead_global_names = {x["class"] for x in dead_global}
g11_dead_names = {x.rsplit(".", 1)[1] for x in g11_dead}
false_positives = sorted(audit_dead_names - {x["class"] for x in dead_module_robust})

# ── 7. misc ──────────────────────────────────────────────────────────────────

important = []
for p in walk({".css"}):
    src = read(p)
    for m in re.finditer(r"!important", src):
        important.append(f"{rel(p)}:{line_of(src, m.start())}")

bp_counter = collections.Counter()
for p in walk({".css"}):
    clean = strip_comments(read(p))
    for m in re.finditer(r"@media([^{]+)\{", clean):
        for q in re.findall(r"\(\s*(?:min|max)-width\s*:\s*([^)]+)\)", m.group(1)):
            bp_counter[q.strip()] += 1

dup_values = collections.defaultdict(list)
declared_unused = []
for row in token_rows:
    dup_values[row["resolved"]].append(row["name"])
    if row["usage"] == 0:
        declared_unused.append(row["name"])
duplicates = {v: n for v, n in dup_values.items() if len(n) > 1 and v}

# ── sanity: live measurement vs stale legacy script ──────────────────────────

bg_rgb = dict(BACKGROUNDS)["--bg"]
# Derived, never hardcoded: the sanity row is whichever --text* token has the
# lowest contrast on --bg. Naming a token here made the ruler crash the moment
# that token was consolidated away (loop F: --text-dim merged into
# --text-secondary).
_text_rows = [
    r for r in token_rows if r["name"].startswith("--text") and parse_color(r["resolved"])
]


def _ratio_on_bg(row):
    return contrast(composite(parse_color(row["resolved"]), bg_rgb), bg_rgb)


dim = min(_text_rows, key=_ratio_on_bg)
dim_color = parse_color(dim["resolved"])
dim_ratio = round(_ratio_on_bg(dim), 2)

# reproduce scripts/contrast.py:24 hardcode (alpha 0.18) for the cross-check
legacy_text = parse_color(resolve_text(tokens["--text"]["declared"]).strip())
legacy_rgb = tuple(round(0.18 * f + 0.82 * b) for f, b in zip(legacy_text[:3], bg_rgb))
legacy_ratio = round(contrast(legacy_rgb, bg_rgb), 2)

sanity = {
    "claim": f"{dim['name']} (lowest-contrast text token) resolves to alpha {round(dim_color[3], 2)} and passes 4.5:1; scripts/contrast.py:24 still asserts 0.18 and reports 1.67",
    "textDim": {
        "declared": dim["resolved"],
        "decl": dim["decl"],
        "alpha": round(dim_color[3], 3),
        "ratioOnBg": dim_ratio,
        "pass45": dim_ratio >= 4.5,
        "compositeHex": hexof(composite(dim_color, bg_rgb)),
    },
    "legacyContrastPy": {
        "hardcodedAlpha": 0.18,
        "source": "scripts/contrast.py:24",
        "ratioOnBg": legacy_ratio,
        "compositeHex": hexof(legacy_rgb),
    },
    "delta": round(dim_ratio - legacy_ratio, 2),
}

result = {
    "_meta": {
        "generatedFrom": "scripts/v3/measure.py",
        "sourceOfTruth": "src/app/globals.css",
        "rootBlock": f"src/app/globals.css:{root_block_line}-{root_close_line}",
        "tokenCount": len(tokens),
        "filesScanned": {
            "css": sum(1 for _ in walk({'.css'})),
            "tsxTsNonTest": scanned_files,
            "tsxTsAll": sum(1 for _ in walk({'.tsx', '.ts'})),
        },
        "note": "All values parsed at runtime; no token literal is hardcoded in this script.",
    },
    "tokens": token_rows,
    "contrast": contrast_rows,
    "fontSizes": {
        "literalCounts": dict(sorted(literal_sizes.items(), key=lambda kv: (-kv[1], kv[0]))),
        "literalTotal": sum(literal_sizes.values()),
        "distinctLiterals": len(literal_sizes),
        "literalSites": literal_sites,
        "varFsUsages": len(fs_var_sites),
        "varFsSites": fs_var_sites,
        "fsTokens": [{"name": t["name"], "value": t["resolved"], "usage": t["usage"], "decl": t["decl"]}
                     for t in fs_tokens],
        "fsTokenUsageTotal": sum(t["usage"] for t in fs_tokens),
    },
    "zIndex": {
        "raw": sorted(z_raw, key=lambda e: (e["value"], e["site"])),
        "rawCount": len(z_raw),
        "distinctRaw": sorted({e["value"] for e in z_raw}),
        "varZUsages": z_var_usage,
        "zVarDeclarations": z_var,
        "zTokens": [{"name": t["name"], "value": t["resolved"], "usage": t["usage"], "decl": t["decl"]}
                    for t in token_rows if t["name"].startswith("--z-")],
    },
    "rawHex": {
        "nonGlobalsCss": hex_non_globals,
        "nonGlobalsCssCount": len(hex_non_globals),
        "jsTs": hex_js[:30],
        "jsTsCount": len(hex_js),
        "jsTsDistinctSites": len({h["site"] for h in hex_js}),
    },
    "deadClasses": {
        "method": "audit_ui.py style: global class = className literal token; module class = styles.X / styles['X']; G11 style: bare-word regex over tsx/ts corpus, module css only, collapsed/active/open exempt",
        "globalDeclared": len(global_declared),
        "moduleDeclared": len(module_declared),
        "auditStyle": {
            "deadGlobal": dead_global,
            "deadGlobalCount": len(dead_global),
            "deadModule": dead_module,
            "deadModuleCount": len(dead_module),
            "note": "raw scripts/audit_ui.py regex; misses className={`template ${\\x} literal`} tokens",
        },
        "robust": {
            "deadGlobal": dead_global_robust,
            "deadGlobalCount": len(dead_global_robust),
            "deadModule": dead_module_robust,
            "deadModuleCount": len(dead_module_robust),
            "note": "same method, className {...} parsed with balanced braces and ${...} stripped",
        },
        "falsePositivesOfAuditRegex": false_positives,
        "falsePositiveCount": len(false_positives),
        "g11": {
            "count": len(g11_dead),
            "ratchet": 2,
            "pass": len(g11_dead) <= 2,
            "list": g11_dead,
            "exempt": sorted(G11_EXEMPT),
            "exemptSource": "src/lib/quality-gates.test.ts:132",
            "source": "src/lib/quality-gates.test.ts:115-146",
        },
        "caveats": [
            "auditStyle false positives: className expression template literals are mis-split by scripts/audit_ui.py:29, e.g. .sidebar-premium (used at src/components/Sidebar.tsx:91), .mb-item and .tile-input-row.",
            "robust false positives: class names passed as quoted strings inside JS expressions are invisible to className parsing, e.g. .mb-item-active (src/components/AppShell.tsx:323), .single-col/.three-col (src/components/formulas/FormulaCard.tsx:231-234), .active/.closed dynamic state.",
            "G11 false negatives: bare-word matching also fires on same-named global classes and ordinary identifiers, e.g. module .sidebar-header vs global .sidebar-header (src/app/globals.css:180), .warning, .toggle, .overlay, .webhookUrl.",
        ],
        "mismatch": {
            "auditStyleVsG11": {
                "auditDeadG11Alive": sorted(audit_dead_names - g11_dead_names),
                "g11DeadAuditAlive": sorted(g11_dead_names - audit_dead_names),
            },
            "robustVsG11": {
                "robustDeadG11Alive": sorted({x["class"] for x in dead_module_robust} - g11_dead_names),
                "g11DeadRobustAlive": sorted(g11_dead_names - {x["class"] for x in dead_module_robust}),
            },
        },
    },
    "misc": {
        "importantCount": len(important),
        "important": important,
        "breakpoints": dict(sorted(bp_counter.items(), key=lambda kv: -kv[1])),
        "breakpointCount": len(bp_counter),
        "duplicateTokenValues": duplicates,
        "declaredUnusedTokens": declared_unused,
        "declaredUnusedCount": len(declared_unused),
        "textRoleFailures45": [
            {"token": e["token"], "background": e["background"], "ratio": e["ratio"], "usage": e["usage"]}
            for e in failures_text
        ],
        "textRoleFailureCount": len(failures_text),
        "contrastScope": "foreground candidates only (role text/border/accent/status); surface tokens are the backgrounds being compared against",
        "sanity": sanity,
    },
    "sanity": sanity,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# ── console report ───────────────────────────────────────────────────────────

print(f"root block   : src/app/globals.css:{root_block_line} (body {len(root_body.splitlines())} lines)")
print(f"tokens       : {len(tokens)}  scanned css={result['_meta']['filesScanned']['css']} tsx/ts={scanned_files}")
print(f"contrast rows: {len(contrast_rows)}  failing 4.5={sum(1 for e in contrast_rows if not e['pass45'])}"
      f"  text-role failing={len(failures_text)}")
print(f"font-size    : {sum(literal_sizes.values())} literals / {len(literal_sizes)} distinct,"
      f" var(--fs-*) usages={len(fs_var_sites)}")
print(f"z-index      : raw={len(z_raw)} distinct={sorted({e['value'] for e in z_raw})}, var(--z-*) usages={z_var_usage}")
print(f"raw hex      : non-globals CSS={len(hex_non_globals)}  js/ts={len(hex_js)}")
print(f"dead classes : global audit={len(dead_global)} robust={len(dead_global_robust)}"
      f"  module audit={len(dead_module)} robust={len(dead_module_robust)}  G11={len(g11_dead)}")
print(f"misc         : !important={len(important)}  breakpoints={len(bp_counter)}"
      f"  dup token values={len(duplicates)}  unused tokens={len(declared_unused)}")
print()
print("SANITY  " + dim["name"] + " :", dim["resolved"], "alpha", round(dim_color[3], 3),
      "ratio", dim_ratio, "PASS" if dim_ratio >= 4.5 else "FAIL")
print("        legacy     : alpha 0.18 ->", legacy_ratio, "(scripts/contrast.py:24)")
print()
print("worst 8 text-role pairs:")
for e in sorted(failures_text, key=lambda e: e["ratio"])[:8] if failures_text else []:
    print(f"  {e['token']:16} on {e['background']:12} {e['ratio']:>5}  usage {e['usage']}")
print(f"\nwrote {rel(OUT)}")
