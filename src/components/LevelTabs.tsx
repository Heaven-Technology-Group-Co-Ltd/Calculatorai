"use client";

import React, { memo } from "react";
import { levels as levelData } from "@/lib/math-data";
import { uiTranslations } from "@/lib/translations";
import type { Lang } from "@/types/locale";
import { Layers } from "lucide-react";
import styles from "./LevelTabs.module.css";

interface LevelTabsProps {
  lang: Lang;
  activeLevel: "all" | string;
  setActiveLevel: (level: "all" | string) => void;
}

function LevelTabsInner({ lang, activeLevel, setActiveLevel }: LevelTabsProps) {
  return (
    <div className={styles.tabsRow}>
      <button
        className={`${styles.chip} ${activeLevel === "all" ? styles.chipActive : ""}`}
        onClick={() => setActiveLevel("all")}
        aria-pressed={activeLevel === "all"}
      >
        <span className={styles.chipIcon}><Layers size={16} /></span>
        {uiTranslations.allLevels[lang]}
      </button>
      {levelData.map(lv => (
        <button
          key={lv.id}
          className={`${styles.chip} ${activeLevel === lv.id ? styles.chipActive : ""}`}
          style={{ "--level-color": lv.color } as React.CSSProperties}
          onClick={() => setActiveLevel(lv.id)}
          aria-pressed={activeLevel === lv.id}
        >
          {(() => { const Icon = lv.icon; return <span className={styles.icon}><Icon size={20} /></span>; })()}
          {lv.title[lang]}
        </button>
      ))}
    </div>
  );
}

export const LevelTabs = React.memo(LevelTabsInner);
