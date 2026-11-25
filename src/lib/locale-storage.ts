import type { Lang } from "@/types/locale";

const LOCALES = ["th", "en", "jp", "ch", "ko"] as const satisfies readonly Lang[];

type LocaleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function normalizeLocale(value: string | null): Lang | null {
  if (value === null) return null;
  const normalized = value.toLowerCase();
  return LOCALES.find((locale) => locale === normalized) ?? null;
}

export function restoreLocale(storage: LocaleStorage): Lang {
  let canonical: string | null;
  try {
    canonical = storage.getItem("pref-lang");
  } catch {
    return "en";
  }

  const saved = normalizeLocale(canonical);
  if (saved) {
    try {
      storage.removeItem("language");
    } catch { /* Keep valid canonical locale when legacy cleanup fails. */ }
    return saved;
  }

  let legacy: string | null;
  try {
    legacy = storage.getItem("language");
  } catch {
    return "en";
  }

  const migrated = normalizeLocale(legacy);
  if (!migrated) return "en";

  try {
    storage.setItem("pref-lang", migrated);
  } catch { /* Keep migrated locale in memory when storage is read-only. */ }
  try {
    storage.removeItem("language");
  } catch { /* Keep migrated locale in memory when cleanup fails. */ }
  return migrated;
}
