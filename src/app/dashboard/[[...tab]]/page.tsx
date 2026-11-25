import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Admin Dashboard | Premium Math Calculator",
  description: "แผงควบคุมระบบ จัดการผู้ใช้ รายได้ และการตั้งค่าระบบแอดมิน",
};

const VALID_TABS = ["overview", "analytics", "finance", "users", "settings"] as const;
type TabId = typeof VALID_TABS[number];

export function generateStaticParams() {
  return [
    { tab: [] },
    ...VALID_TABS.map((t) => ({ tab: [t] })),
  ];
}

/**
 * Auth and dependency-failure status live in `src/proxy.ts`: a page (Server
 * Component) cannot return a `NextResponse`, so the gate must run in the proxy.
 * This page only renders content.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const resolvedParams = await params;
  const tabParam = resolvedParams.tab?.[0] ?? "overview";

  if (!VALID_TABS.includes(tabParam as TabId)) {
    notFound();
  }

  return <DashboardClient initialTab={tabParam as TabId} />;
}
