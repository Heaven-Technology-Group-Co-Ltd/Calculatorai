"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type TabId = "overview" | "analytics" | "finance" | "users" | "settings";
type DateRange = "7d" | "30d" | "90d" | "custom";

interface DashboardContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  customDateRange: { from: Date; to: Date } | null;
  setCustomDateRange: (range: { from: Date; to: Date } | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface DashboardProviderProps {
  children: ReactNode;
  initialTab?: TabId;
}

export function DashboardProvider({ children, initialTab = "overview" }: DashboardProviderProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        dateRange,
        setDateRange,
        customDateRange,
        setCustomDateRange,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardContext must be used within DashboardProvider");
  return ctx;
}
