export function computePercentages(counts: { desktop: number; mobile: number; tablet: number }) {
  const keys = ["desktop", "mobile", "tablet"] as const;
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  const percentages = { desktop: 0, mobile: 0, tablet: 0 };
  if (total <= 0) return percentages;
  const ranked = keys.map((key) => ({ key, exact: counts[key] * 100 / total }));
  for (const entry of ranked) percentages[entry.key] = Math.floor(entry.exact);
  ranked.sort((left, right) => (right.exact % 1) - (left.exact % 1));
  const remainder = 100 - keys.reduce((sum, key) => sum + percentages[key], 0);
  for (let index = 0; index < remainder; index++) percentages[ranked[index].key]++;
  return percentages;
}

