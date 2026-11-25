import type { Lang } from "@/types/locale";

const LOCALES = ["th", "en", "jp", "ch", "ko"] as const satisfies readonly Lang[];

type LocaleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function normalizeLocale(value: string | null): Lang | null {
  if (value === null) return null;
  const normalized = value.toLowerCase();
  return LOCALES.find((locale) => locale === normalized) ?? null;
}

// Locale as an external store, so React can read it during render
// (useSyncExternalStore) instead of restoring it from an effect. The cache keeps
// the snapshot referentially stable and the server snapshot fixed, so hydration
// stays deterministic.
let currentLocale: Lang | null = null;
const localeListeners = new Set<() => void>();

export function subscribeLocale(onChange: () => void): () => void {
  localeListeners.add(onChange);
  return () => {
    localeListeners.delete(onChange);
  };
}

export function getLocaleSnapshot(): Lang {
  if (currentLocale === null) {
    try {
      currentLocale = restoreLocale(window.sessionStorage);
    } catch {
      currentLocale = "en";
    }
  }
  return currentLocale;
}

export function getServerLocaleSnapshot(): Lang {
  return "en";
}

export function setLocale(locale: Lang): void {
  currentLocale = locale;
  try {
    window.sessionStorage.setItem("pref-lang", locale);
  } catch { /* Keep the in-memory selection when storage is unavailable. */ }
  for (const listener of localeListeners) listener();
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
