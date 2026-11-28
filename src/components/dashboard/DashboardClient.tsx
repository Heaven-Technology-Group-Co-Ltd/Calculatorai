"use client";

import { DashboardProvider } from "./DashboardProvider";
import { DashboardShell } from "./DashboardShell";
import { ToastProvider } from "@/components/ui/Toast";
import { useDashboardContext } from "./DashboardProvider";
import { OverviewPage } from "./pages/OverviewPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { FinancePage } from "./pages/FinancePage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";

function DashboardRouter() {
  const { activeTab } = useDashboardContext();

  switch (activeTab) {
    case "overview":
      return <OverviewPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "finance":
      return <FinancePage />;
    case "users":
      return <UsersPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <OverviewPage />;
  }
}

type TabId = "overview" | "analytics" | "finance" | "users" | "settings";

export function DashboardClient({ initialTab = "overview" }: { initialTab?: TabId }) {
  return (
    <ToastProvider>
      <DashboardProvider initialTab={initialTab}>
        <DashboardShell>
          <DashboardRouter />
        </DashboardShell>
      </DashboardProvider>
    </ToastProvider>
  );
}
