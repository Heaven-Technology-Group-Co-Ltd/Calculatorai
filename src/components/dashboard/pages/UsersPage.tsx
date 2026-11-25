"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUsers, type DashboardUser } from "../hooks/useUsers";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import { StatusBadge } from "../ui/StatusBadge";
import { UserDetailModal } from "../modals/UserDetailModal";
import { MessageModal } from "../modals/MessageModal";
import { BanConfirmModal } from "../modals/BanConfirmModal";
import { PlanChangeModal } from "../modals/PlanChangeModal";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-tables.module.css";
import blockStyles from "../styles/dashboard-blocks.module.css";

export function UsersPage() {
  const { t } = useDashboardT();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, error, isLoading, mutate } = useUsers({
    page,
    search: debouncedSearch,
    status: statusFilter,
    perPage: 25,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Search + Filters */}
      <div className={blockStyles.chipRow}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input
            className={styles.searchInput}
            placeholder={t("dashboard.search.placeholder")}
            aria-label={t("dashboard.search.placeholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className={styles.filterSelect}
          aria-label={t("dashboard.table.status")}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table */}
      <Panel padding="md">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("dashboard.users.table.user")}</th>
                <th>{t("dashboard.users.table.email")}</th>
                <th>{t("dashboard.users.table.plan")}</th>
                <th>{t("dashboard.table.status")}</th>
                <th>{t("dashboard.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5}>
                    <Skeleton variant="chart" height={200} />
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={5}>
                    <ErrorState message={t("dashboard.error.loadUsersFailed")} onRetry={mutate} />
                  </td>
                </tr>
              )}
              {!isLoading && !error &&
                users.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.cellName}>{u.name}</td>
                    <td className={styles.cellDim}>{u.email}</td>
                    <td>
                      <span className={styles.planBadge}>{u.plan}</span>
                    </td>
                    <td>
                      <StatusBadge status={u.status as "active" | "suspended" | "banned"} />
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.actionBtn}
                          title={t("dashboard.users.actions.view")}
                          onClick={() => { setSelectedUser(u); setActiveModal("detail"); }}
                        >
                          👁
                        </button>
                        <button
                          className={styles.actionBtn}
                          title={t("dashboard.users.actions.message")}
                          onClick={() => { setSelectedUser(u); setActiveModal("message"); }}
                        >
                          ✉
                        </button>
                        <button
                          className={styles.actionBtn}
                          title={u.status === "banned" ? t("dashboard.users.actions.unban") : t("dashboard.users.actions.ban")}
                          onClick={() => { setSelectedUser(u); setActiveModal("ban"); }}
                        >
                          🚫
                        </button>
                        <button
                          className={styles.actionBtn}
                          title={t("dashboard.users.actions.changePlan")}
                          onClick={() => { setSelectedUser(u); setActiveModal("plan"); }}
                        >
                          💳
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#7A7570" }}>
                    {t("dashboard.users.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={15} style={{ marginRight: 2 }} />
              {t("dashboard.users.pagination.previous")}
            </button>
            <span className={styles.pageInfo}>
              {t("dashboard.users.pagination.showing")} {(page - 1) * pageSize + 1} {t("dashboard.users.pagination.to")} {Math.min(page * pageSize, total)} {t("dashboard.users.pagination.of")} {total}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("dashboard.users.pagination.next")}
              <ChevronRight size={15} style={{ marginLeft: 2 }} />
            </button>
          </div>
        )}
      </Panel>

      {selectedUser && activeModal === "detail" && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => { setSelectedUser(null); setActiveModal(null); }}
        />
      )}
      {selectedUser && activeModal === "message" && (
        <MessageModal
          user={selectedUser}
          onClose={() => { setSelectedUser(null); setActiveModal(null); }}
          onSuccess={() => mutate()}
        />
      )}
      {selectedUser && activeModal === "ban" && (
        <BanConfirmModal
          user={selectedUser}
          onClose={() => { setSelectedUser(null); setActiveModal(null); }}
          onSuccess={() => mutate()}
        />
      )}
      {selectedUser && activeModal === "plan" && (
        <PlanChangeModal
          user={selectedUser}
          onClose={() => { setSelectedUser(null); setActiveModal(null); }}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}
