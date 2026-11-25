"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";
import type { Lang } from "@/types/locale";
import { formulas } from "@/lib/formulas/registry";
import { levels } from "@/lib/math-data";

interface HomeHeroProps {
  lang: Lang;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isMobile?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  lang,
  searchQuery,
  setSearchQuery,
  isMobile,
  inputRef,
}) => {
  const isThai = lang === "th";
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchPlaceholder = isThai
    ? "ค้นหาสูตร, ระดับชั้น, หรือหัวข้อ…"
    : "Search formulas, levels, topics…";

  return (
    <section className="hero">
      <h1>
        {isThai
          ? "เครื่องคิดเลขคณิตศาสตร์"
          : "Premium Math Calculator"}
      </h1>
      <p>
        {isThai
          ? "เครื่องมือคำนวณคณิตศาสตร์ครอบคลุมทุกหัวข้อ"
          : "Comprehensive mathematics calculator for every topic"}
      </p>
      <div
        className="search-row"
        style={{
          borderColor: isSearchFocused ? "var(--border-gold)" : undefined,
        }}
      >
        <Search size={16} style={{ opacity: 0.35, flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="search-clear-btn"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : (
          !isSearchFocused && <kbd className="search-kbd">⌘K</kbd>
        )}
      </div>
      <div className="hero-stats">
        <div className="hero-stat">
          <strong>{formulas.length}</strong>{" "}
          {isThai ? "สูตร" : "Formulas"}
        </div>
        <div className="hero-stat">
          <strong>{levels.length}</strong>{" "}
          {isThai ? "ระดับชั้น" : "Levels"}
        </div>
        <div className="hero-stat">
          <strong>99.9%</strong>{" "}
          {isThai ? "ความแม่นยำ" : "Accuracy"}
        </div>
      </div>
    </section>
  );
};
