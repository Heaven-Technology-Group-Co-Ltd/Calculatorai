"use client";

import { useState, type CSSProperties } from "react";
import { Grid, type CellComponentProps } from "react-window";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { useAnalytics, type FormulaUsageItem } from "../hooks/useAnalytics";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

const CELL_SIZE = 80;
const COLUMN_COUNT = 8;

interface HeatmapCellProps {
  formulas: FormulaUsageItem[];
  topCount: number;
}

function HeatmapCell({
  columnIndex,
  rowIndex,
  style,
  formulas,
  topCount,
}: CellComponentProps<HeatmapCellProps>) {
  const idx = rowIndex * COLUMN_COUNT + columnIndex;
  const f = formulas[idx];
  if (!f) return <div style={style} />;
  const intensity = Math.min((f.count / (topCount || 1)) * 100, 100);
  return (
    <div
      style={{
        ...style,
        background: `rgba(232, 184, 150, ${(intensity / 100) * 0.4})`,
        border: "1px solid rgba(232, 184, 150, 0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        cursor: "default",
      } as CSSProperties}
      title={`${f.name}: ${f.count}`}
    >
      <span style={{ fontWeight: 600 }}>{f.name}</span>
      <span style={{ color: "var(--text-secondary)" }}>{f.count}</span>
    </div>
  );
}

export function FormulaHeatmap() {
  const [showAll, setShowAll] = useState(false);
  const { t } = useDashboardT();
  const { data, error, isLoading } = useAnalytics({ type: "sessions" });
  const formulas = data?.formulas ?? [];

  if (error) return null;
  if (isLoading) return <Panel><Skeleton variant="panel" /></Panel>;
  if (!formulas.length) return null;

  const displayFormulas = showAll ? formulas : formulas.slice(0, 50);
  const rowCount = Math.ceil(displayFormulas.length / COLUMN_COUNT);

  return (
    <Panel>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{t("dashboard.formula.heatmap")}</span>
        {formulas.length > 50 && (
          <span
            className={styles.panelAction}
            onClick={() => setShowAll((v) => !v)}
            style={{ cursor: "pointer" }}
          >
            {showAll ? t("dashboard.formula.showTop50") : `${t("dashboard.formula.showAll")} (${formulas.length})`}
          </span>
        )}
      </div>
      <div style={{ height: Math.min(rowCount * CELL_SIZE, 320) }}>
        <Grid
          columnCount={COLUMN_COUNT}
          columnWidth={CELL_SIZE}
          rowCount={rowCount}
          rowHeight={CELL_SIZE}
          cellProps={{ formulas: displayFormulas, topCount: formulas[0]?.count || 1 }}
          cellComponent={HeatmapCell}
        />
      </div>
    </Panel>
  );
}
