"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import type { Lang } from "@/types/locale";
import styles from "./LanguageDropdown.module.css";

export interface LanguageDropdownProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  showLangMenu: boolean;
  setShowLangMenu: (show: boolean) => void;
  isHidden: boolean;
}

const langInfo: Record<Lang, { flag: string; label: string }> = {
  th: { flag: "🇹🇭", label: "TH" },
  en: { flag: "🇺🇸", label: "EN" },
  jp: { flag: "🇯🇵", label: "JP" },
  ch: { flag: "🇨🇳", label: "CH" },
  ko: { flag: "🇰🇷", label: "KO" },
};

const ALL_LANGS: Lang[] = ["en", "th", "jp", "ch", "ko"];

function LanguageDropdownInner({
  lang,
  setLang,
  showLangMenu,
  setShowLangMenu,
  isHidden,
}: LanguageDropdownProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    },
    [setShowLangMenu]
  );

  useEffect(() => {
    if (showLangMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showLangMenu, handleClickOutside]);

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowLangMenu(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const options = menuRef.current
        ? Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]'))
        : [];
      if (options.length === 0) return;
      const current = options.indexOf(document.activeElement as HTMLButtonElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      options[(current + step + options.length) % options.length].focus();
    },
    [setShowLangMenu]
  );

  if (isHidden) return null;

  return (
    <div
      ref={wrapperRef}
      className="lang-dropdown-wrapper"
    >
      <button
        ref={triggerRef}
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={showLangMenu}
        aria-controls={showLangMenu ? "lang-menu" : undefined}
        onClick={() => setShowLangMenu(!showLangMenu)}
      >
        <Globe size={14} />
        <span style={{ fontWeight: 600, fontSize: 12 }}>{langInfo[lang].label}</span>
        <ChevronDown size={12} style={{
          transition: "transform 0.2s ease",
          transform: showLangMenu ? "rotate(180deg)" : "rotate(0deg)",
        }} />
      </button>

      {showLangMenu && (
        <div
          ref={menuRef}
          id="lang-menu"
          role="listbox"
          tabIndex={0}
          aria-label={langInfo[lang].label}
          onKeyDown={handleMenuKeyDown}
          className="lang-dropdown-menu"
        >
          {ALL_LANGS.map(l => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={lang === l}
              className={`lang-dropdown-item ${lang === l ? "active" : ""}`}
              onClick={() => {
                setLang(l);
                setShowLangMenu(false);
                triggerRef.current?.focus();
              }}
            >
              <span className={styles.flagEmoji}>
                {langInfo[l].flag}
              </span>
              <span>{langInfo[l].label}</span>
              {lang === l && <Check size={10} className={styles.checkMark} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const LanguageDropdown = React.memo(LanguageDropdownInner);
