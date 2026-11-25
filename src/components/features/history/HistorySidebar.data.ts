import type { Lang } from "@/types/locale";

// ── Types ──────────────────────────────────────────────────

export interface HistoryItemData {
  id: string;
  calcId: string;
  calcTitle: string;
  inputs: Record<string, string>;
  result: string;
  unit: string;
  ts: number;
}

export interface HistorySidebarProps {
  show: boolean;
  onClose: () => void;
  lang: Lang;
  history: HistoryItemData[];
  onRestore: (item: HistoryItemData) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  isMobile?: boolean;
}
