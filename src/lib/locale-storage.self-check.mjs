import assert from "node:assert/strict";
import { normalizeLocale, restoreLocale } from "./locale-storage.ts";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    get all() { return Object.fromEntries(map); },
  };
}

const throwingStorage = {
  getItem() { throw new Error("denied"); },
  setItem() { throw new Error("denied"); },
  removeItem() { throw new Error("denied"); },
};

assert.equal(normalizeLocale("ko"), "ko");
assert.equal(normalizeLocale("KO"), "ko");
assert.equal(normalizeLocale("FR"), null);
assert.equal(normalizeLocale("TH"), "th");
assert.equal(normalizeLocale("jp"), "jp");
assert.equal(normalizeLocale("CH"), "ch");
assert.equal(normalizeLocale(null), null);
assert.equal(normalizeLocale(""), null);
assert.equal(restoreLocale(memoryStorage({ "pref-lang": "jp", language: "TH" })), "jp");
const cleaned = memoryStorage({ "pref-lang": "jp", language: "TH" });
restoreLocale(cleaned);
assert.equal(cleaned.all.language, undefined);
const migrated = memoryStorage({ language: "KO" });
assert.equal(restoreLocale(migrated), "ko");
assert.equal(migrated.getItem("pref-lang"), "ko");
assert.equal(migrated.getItem("language"), null);
assert.equal(restoreLocale(memoryStorage({ "pref-lang": "bad", language: "bad" })), "en");
assert.equal(restoreLocale(throwingStorage), "en");
console.log("locale-storage self-check passed");
