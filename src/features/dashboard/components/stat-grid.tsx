"use client";

import { Coins, Gift, PartyPopper } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { mockDashboardStats } from "../data/mock-stats";
import { StatCard } from "./stat-card";

export function StatGrid() {
  const t = useTranslations("dashboard.stats");
  const format = useFormatter();

  const [primaryCash, ...restCash] = mockDashboardStats.totalCashByCurrency;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <StatCard
        index={0}
        icon={PartyPopper}
        label={t("totalEvents")}
        value={format.number(mockDashboardStats.totalEvents)}
      />
      <StatCard index={1} icon={Gift} label={t("totalGifts")} value={format.number(mockDashboardStats.totalGifts)} />
      <StatCard
        index={2}
        icon={Coins}
        label={t("totalMoney")}
        value={primaryCash ? `${format.number(primaryCash.amount)} ${primaryCash.currency}` : "—"}
        secondaryLines={restCash.map(({ currency, amount }) => `${format.number(amount)} ${currency}`)}
      />
    </div>
  );
}
