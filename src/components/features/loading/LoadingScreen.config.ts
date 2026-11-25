// ═══════════════════════════════════════════════════════════════
// LoadingScreen Configuration
// Types, constants, particle config, phase config, helpers
// ═══════════════════════════════════════════════════════════════

import { uiTranslations } from "@/lib/translations";
import type { Lang } from "@/types/locale";

// ── Types ──

export interface ParticleConfig {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export interface LoadingScreenConfig {
  segments: number;
  particleCount: number;
  exitDurationMs: number;
  doneRevealDelayMs: number;
}

export interface PhaseConfig {
  maxProgress: number;
  speed: number;
  textKey: "initializing" | "loadingModules" | "syncing" | "launching" | "ready";
}

// ── Constants ──

export const CONFIG: LoadingScreenConfig = {
  segments: 10,
  particleCount: 12,
  exitDurationMs: 500,
  doneRevealDelayMs: 600,
};

// ── Particle Positions (golden-ratio-like distribution) ──

export const PARTICLE_CONFIGS: ParticleConfig[] = [
  { x: 8,  y: 15, size: 2, delay: 0,   duration: 7 },
  { x: 22, y: 42, size: 3, delay: 0.5, duration: 8 },
  { x: 35, y: 18, size: 2, delay: 1.0, duration: 6 },
  { x: 48, y: 65, size: 4, delay: 1.5, duration: 9 },
  { x: 62, y: 30, size: 2, delay: 2.0, duration: 7 },
  { x: 75, y: 55, size: 3, delay: 2.5, duration: 8 },
  { x: 88, y: 12, size: 2, delay: 3.0, duration: 6 },
  { x: 15, y: 78, size: 3, delay: 3.5, duration: 9 },
  { x: 42, y: 88, size: 2, delay: 4.0, duration: 7 },
  { x: 58, y: 45, size: 4, delay: 4.5, duration: 8 },
  { x: 82, y: 72, size: 2, delay: 5.0, duration: 6 },
  { x: 95, y: 38, size: 3, delay: 5.5, duration: 9 },
];

// ── Animation Phase Configuration ──

export const PHASES: PhaseConfig[] = [
  { maxProgress: 30,  speed: 0.55, textKey: "initializing" },
  { maxProgress: 60,  speed: 0.45, textKey: "loadingModules" },
  { maxProgress: 85,  speed: 0.35, textKey: "syncing" },
  { maxProgress: 100, speed: 0.25, textKey: "launching" },
];

// ── Mobile Optimization ──
export const MOBILE_PARTICLE_REDUCTION = 0.5;

// ── Helpers ──

export function getPhaseText(lang: Lang, textKey: PhaseConfig["textKey"]): string {
  const map: Record<PhaseConfig["textKey"], string> = {
    initializing: uiTranslations.initializing[lang],
    loadingModules: uiTranslations.loadingModules[lang],
    syncing: uiTranslations.syncing[lang],
    launching: uiTranslations.launching[lang],
    ready: uiTranslations.ready[lang],
  };
  return map[textKey];
}

export function getExploreText(lang: Lang): string {
  return uiTranslations.explore[lang].toUpperCase();
}
