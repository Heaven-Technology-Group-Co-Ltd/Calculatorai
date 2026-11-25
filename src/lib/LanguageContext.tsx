"use client";

import React, { createContext, useContext, useCallback, useEffect, useSyncExternalStore } from "react";
import type { Lang } from "@/types/locale";
import { uiTranslations } from "@/lib/translations";
import type { UiTranslationKey } from "@/lib/translations";
import {
  getLocaleSnapshot,
  getServerLocaleSnapshot,
  setLocale,
  subscribeLocale,
} from "@/lib/locale-storage";

type LanguageContextType = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: UiTranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Internal keys jp/ch are not valid BCP-47 primary subtags; only the
// document.lang sync layer needs the real subtags.
const BCP47_LANG: Record<Lang, string> = {
  th: "th",
  en: "en",
  jp: "ja",
  ch: "zh",
  ko: "ko",
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = BCP47_LANG[language];
  }, [language]);

  const setLanguage = useCallback((lang: Lang) => {
    setLocale(lang);
  }, []);

  const t = useCallback((key: UiTranslationKey) => uiTranslations[key][language], [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
