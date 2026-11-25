// Canonical locale types for the app UI.
// Sole owner of the supported locale codes and the five-key translation shape.

export type Lang = "th" | "en" | "jp" | "ch" | "ko";

export interface Translation {
  th: string;
  en: string;
  jp: string;
  ch: string;
  ko: string;
}
