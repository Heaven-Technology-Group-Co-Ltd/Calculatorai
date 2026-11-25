"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Lang } from "@/types/locale";
import { CONFIG, PHASES, getPhaseText, getExploreText } from "./LoadingScreen.config";
import styles from "./LoadingScreen.module.css";

// ═══════════════════════════════════════════════════════════════
interface LoadingScreenProps {
  onEnter: () => void;
  lang: Lang;
}

export function LoadingScreen({ onEnter, lang }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState(() => getPhaseText(lang, "initializing"));
  const [done, setDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const rafRef = useRef<number>(0);
  const hasEnteredRef = useRef(false);

  // ── Animation loop — delta-time based for smooth 60fps ──
  useEffect(() => {
    let cur = 0;
    let lastTime = 0;

    const step = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      // Find current phase and its speed
      const phase = PHASES.find((p) => cur <= p.maxProgress) ?? PHASES[PHASES.length - 1];
      cur += phase.speed * (delta / 16.67);

      if (cur >= 100) {
        setProgress(100);
        setText(getPhaseText(lang, "ready"));
        setTimeout(() => setDone(true), CONFIG.doneRevealDelayMs);
        return;
      }

      const p = Math.min(Math.floor(cur), 99);
      setProgress(p);

      // Update text based on current phase
      const activePhase = PHASES.find((ph) => p <= ph.maxProgress) ?? PHASES[PHASES.length - 1];
      setText(getPhaseText(lang, activePhase.textKey));
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [lang]);

  // ── Compute filled segments (0-10) ──
  const filledSegments = Math.min(Math.floor(progress / 10), CONFIG.segments);

  // ── Handle enter with exit animation ──
  const handleEnter = useCallback(() => {
    if (hasEnteredRef.current) return; // Debounce rapid clicks
    hasEnteredRef.current = true;
    setExiting(true);
    setTimeout(() => onEnter(), CONFIG.exitDurationMs);
  }, [onEnter]);

  return (
    <div className={`${styles.container} ${exiting ? styles.exiting : ""}`} role="status" aria-label="Loading">
      <div className={styles.center}>
        {/* ── Brand ── */}
        <div className={styles.brandWrap}>
          <h1 className={styles.brand}>
            PREMIUM MATH<span className={styles.brandDot}>·</span>
          </h1>
          <p className={styles.brandSub}>CALCULATOR</p>
        </div>

        {/* ── Percentage Counter ── */}
        <div className={styles.counterWrap}>
          <span className={styles.counter}>{Math.floor(progress)}</span>
          <span className={styles.counterPct}>%</span>
        </div>

        {/* ── Phase Status ── */}
        <div className={styles.statusText}>{text}</div>

        {/* ── Progress Segments ── */}
        <div className={styles.progressRow}>
          {Array.from({ length: CONFIG.segments }, (_, i) => (
            <div
              key={i}
              className={`${styles.segment} ${i < filledSegments ? styles.segmentFilled : styles.segmentEmpty}`}
            />
          ))}
        </div>

        {/* ── Explore Button ── */}
        <button
          className={`${styles.exploreBtn} ${done ? styles.exploreBtnVisible : styles.exploreBtnHidden}`}
          onClick={handleEnter}
          disabled={!done}
        >
          {getExploreText(lang)}
        </button>
      </div>
    </div>
  );
}
