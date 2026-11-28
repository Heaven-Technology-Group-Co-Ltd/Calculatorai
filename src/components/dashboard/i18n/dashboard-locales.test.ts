import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard locales", () => {
  const locales = ["en", "th"].map((language) => readFileSync(`src/components/dashboard/i18n/dashboard.${language}.json`, "utf8"));
  it.each(locales)("contains no duplicate translation keys", (source) => {
    const keys = [...source.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1]);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("has the same keys in both locales", () => {
    const english = Object.keys(JSON.parse(locales[0])).sort();
    const thai = Object.keys(JSON.parse(locales[1])).sort();
    expect(thai).toEqual(english);
  });
});
