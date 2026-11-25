"use client";

import { useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import thJson from "./dashboard.th.json";
import enJson from "./dashboard.en.json";

type Locale = "th" | "en";

// Type derived from the English source — both JSONs share the same keys.
export type DashboardTKey = keyof typeof enJson;

const locales = { th: thJson, en: enJson } as Record<
  Locale,
  Record<DashboardTKey, string>
>;

type Params = Record<string, string | number>;

/**
 * Dashboard i18n hook.
 *
 * Usage:
 *   const { t, locale } = useDashboardT();
 *   t("dashboard.nav.overview")                              // simple lookup
 *   t("dashboard.modal.ban.description", { name: "Alice" })   // interpolation
 */
export function useDashboardT() {
  const { language } = useLanguage();
  const locale: Locale = language === "th" ? "th" : "en";
  const strings = locales[locale];

  const t = useCallback(
    (key: DashboardTKey, params?: Params, fallback?: string) => {
      let value: string = strings[key] ?? fallback ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [strings],
  );

  return { t, locale };
}
