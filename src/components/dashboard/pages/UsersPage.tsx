"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, Mail, Ban, CreditCard } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { USER_STATUS_FILTERS, USER_STATUS_FILTER_LABELS } from "@/lib/validation/vocabulary";
import { useUsers, type DashboardUser } from "../hooks/useUsers";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import { StatusBadge } from "../ui/StatusBadge";
import { UserDetailModal } from "../modals/UserDetailModal";
import { UserActionDialog } from "../modals/UserActionDialog";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-tables.module.css";
import blockStyles from "../styles/dashboard-blocks.module.css";
import { useToast } from "@/components/ui/Toast";

export function UsersPage() {
  const { t } = useDashboardT();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, error, isLoading, mutate } = useUsers({
    page,
    search: debouncedSearch,
    status: statusFilter,
    perPage: 25,
  });

  const users = (data?.data ?? []).map((user) => ({ ...user, status: user.is_banned === undefined ? user.status : user.is_banned ? "banned" as const : user.email_verified === null ? "unverified" as const : "active" as const, last_seen_at: user.last_active_at ?? user.last_seen_at }));
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
          {USER_STATUS_FILTERS.map((filter) => (
            <option key={filter} value={filter}>{USER_STATUS_FILTER_LABELS[filter]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Panel padding="md">
        <div className={styles.tableWrap} role="region" aria-label={t("dashboard.users.table.scrollHint")}>
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
                      <StatusBadge status={u.status} />
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.actionBtn}
                          title={t("dashboard.users.actions.view")}
                          aria-label={t("dashboard.users.actions.view")}
                          onClick={() => { setSelectedUser(u); setActiveModal("detail"); }}
                        >
                          <Eye size={16} aria-hidden="true" focusable="false" />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title={t("dashboard.users.actions.message")}
                          aria-label={t("dashboard.users.actions.message")}
                          onClick={() => { setSelectedUser(u); setActiveModal("message"); }}
                        >
                          <Mail size={16} aria-hidden="true" focusable="false" />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title={u.status === "banned" ? t("dashboard.users.actions.unban") : t("dashboard.users.actions.ban")}
                          aria-label={u.status === "banned" ? t("dashboard.users.actions.unban") : t("dashboard.users.actions.ban")}
                          onClick={() => { setSelectedUser(u); setActiveModal("ban"); }}
                        >
                          <Ban size={16} aria-hidden="true" focusable="false" />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title={t("dashboard.users.actions.changePlan")}
                          aria-label={t("dashboard.users.actions.changePlan")}
                          onClick={() => { setSelectedUser(u); setActiveModal("plan"); }}
                        >
                          <CreditCard size={16} aria-hidden="true" focusable="false" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={5}><EmptyState variant="inline" message={t("dashboard.users.empty")} /></td>
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
      {selectedUser && (activeModal === "message" || activeModal === "ban" || activeModal === "plan") && (
        <UserActionDialog user={selectedUser} action={activeModal} onClose={() => { setSelectedUser(null); setActiveModal(null); }} onSuccess={() => { void mutate(); showToast(t(activeModal === "ban" ? (selectedUser.status === "banned" ? "dashboard.toast.userUnbanned" : "dashboard.toast.userBanned") : activeModal === "plan" ? "dashboard.toast.planChanged" : "dashboard.toast.messageSent")); }} />
      )}
    </div>
  );
}
