"use client";

import useSWR from "swr";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import { fetcher } from "@/lib/fetcher";
import { useDashboardT } from "../i18n/useDashboardT";
import tableStyles from "../styles/dashboard-tables.module.css";

interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
}

export function InvoiceTable() {
  const { t } = useDashboardT();
  // SWR keeps the fetch lifecycle out of an effect, matching the dashboard hooks.
  const { data = [], error, isLoading: loading, mutate } = useSWR<Invoice[]>(
    "/api/finance/invoices",
    fetcher,
  );

  return (
    <Panel>
      <h3 className={`${tableStyles.sectionTitle} ${tableStyles.sectionTitleSpaced}`}>
        {t("dashboard.finance.invoices.title")}
      </h3>
      {loading && (
        <>
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" height={32} />
        </>
      )}
      {error && (
        <ErrorState message={t("dashboard.error.loadInvoicesFailed")} onRetry={() => void mutate()} />
      )}
      {!loading && !error && (
        <div className={tableStyles.tableWrapper}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th className={tableStyles.thLeft}>Invoice</th>
                <th>{t("dashboard.table.amount")}</th>
                <th>{t("dashboard.table.status")}</th>
                <th>{t("dashboard.table.date")}</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className={tableStyles.cellEmpty}>No invoices</td>
                </tr>
              )}
              {data.map((inv) => (
                <tr key={inv.id}>
                  <td className={tableStyles.cellName}>{inv.id}</td>
                  <td>${(inv.amount / 100).toFixed(2)}</td>
                  <td>
                    <span className={tableStyles.planBadge}>{inv.status}</span>
                  </td>
                  <td className={tableStyles.cellDim}>{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
