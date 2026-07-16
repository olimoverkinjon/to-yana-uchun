import type { Metadata } from "next";

import { DashboardGreeting, RecentActivityList, StatGrid } from "@/features/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Wedding Registry",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardGreeting />
      <StatGrid />
      <RecentActivityList />
    </div>
  );
}
