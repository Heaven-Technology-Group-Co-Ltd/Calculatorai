"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";
import { levels } from "@/lib/math-data";
import { uiTranslations } from "@/lib/translations";
import type { Lang } from "@/types/locale";
import styles from "./LevelFilter.module.css";

interface LevelFilterProps {
  lang: Lang;
  activeLevel: "all" | string;
  setActiveLevel: (level: "all" | string) => void;
}

export function LevelFilter({ lang, activeLevel, setActiveLevel }: LevelFilterProps) {
  return (
    <div className={styles.filterRow}>
      <button
        className={`${styles.filterChip} ${activeLevel === "all" ? styles.filterChipActive : ""}`}
        onClick={() => setActiveLevel("all")}
        aria-pressed={activeLevel === "all"}
      >
        <span className={styles.icon}><LayoutGrid size={16} /></span>
        {uiTranslations.allLevels[lang]}
      </button>

      {levels.map(lv => (
        <button
          key={lv.id}
          className={`${styles.filterChip} ${activeLevel === lv.id ? styles.filterChipActive : ""}`}
          style={{ "--level-color": lv.color } as React.CSSProperties}
          onClick={() => setActiveLevel(lv.id)}
          aria-pressed={activeLevel === lv.id}
        >
          {(() => { const Icon = lv.icon; return <span className={styles.icon}><Icon size={16} /></span>; })()}
          {lv.title[lang]}
        </button>
      ))}
    </div>
  );
}
