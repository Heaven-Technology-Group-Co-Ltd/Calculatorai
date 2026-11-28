"use client";

import useSWR from "swr";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import { fetcher } from "@/lib/fetcher";
import { useDashboardT } from "../i18n/useDashboardT";
import tableStyles from "../styles/dashboard-tables.module.css";

interface Refund {
  id: string;
  amount_cents: number;
  reason: string | null;
  created_at: string;
}

export function RefundTable() {
  const { t } = useDashboardT();
  const { data, error, isLoading: loading, mutate } = useSWR<Refund[]>(
    "/api/finance/refunds",
    fetcher,
  );
  const refunds = Array.isArray(data) ? data : [];

  return (
    <Panel>
      <h3 className={`${tableStyles.sectionTitle} ${tableStyles.sectionTitleCompact}`}>
        {t("dashboard.finance.refunds.title")}
      </h3>
      {loading && <Skeleton variant="chart" height={200} />}
      {error && (
        <ErrorState message={t("dashboard.error.loadRefundsFailed")} onRetry={() => void mutate()} />
      )}
      {!loading && !error && (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Refund ID</th>
                <th>{t("dashboard.table.amount")}</th>
                <th>Reason</th>
                <th>{t("dashboard.table.date")}</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={4} className={tableStyles.emptyCell}>
                    {t("dashboard.finance.refunds.empty")}
                  </td>
                </tr>
              )}
              {refunds.map((ref) => (
                <tr key={ref.id}>
                  <td className={tableStyles.cellName}>{ref.id}</td>
                  <td>${(ref.amount_cents / 100).toFixed(2)}</td>
                  <td className={tableStyles.cellDim}>{ref.reason ?? "-"}</td>
                  <td className={tableStyles.cellDim}>{new Date(ref.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
