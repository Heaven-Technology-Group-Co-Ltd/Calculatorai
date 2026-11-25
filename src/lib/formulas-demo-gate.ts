/**
 * Second-layer gate for the /formulas-demo internal gallery (the first layer
 * lives in src/proxy.ts). This runs inside the page, which is rendered
 * per-request via force-dynamic: a static prerender would bake the build-time
 * env decision and ignore ENABLE_FORMULAS_DEMO set at `next start` — that was
 * the Loop #3 flag-path failure (probe-verified 2026-10-24, Log: HANDOFF
 * AUDIT #3 item 0j).
 */
export function isFormulasDemoEnabled(
  nodeEnv: string | undefined,
  flag: string | undefined,
): boolean {
  return !(nodeEnv === "production" && flag !== "true");
}
