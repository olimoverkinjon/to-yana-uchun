"use client";

import { motion } from "framer-motion";
import { CalendarPlus, Gift, PencilLine } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { mockRecentActivity } from "../data/mock-stats";
import type { ActivityItem } from "../types";

const actionIcons: Record<ActivityItem["actionKey"], typeof Gift> = {
  gift_added: Gift,
  gift_updated: PencilLine,
  event_created: CalendarPlus,
};

export function RecentActivityList() {
  const t = useTranslations("dashboard");
  const format = useFormatter();

  return (
    <Card className="glass-panel gap-0 border-0 py-0 ring-0">
      <CardHeader className="p-5 pb-0">
        <CardTitle className="text-base font-semibold">{t("stats.recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {mockRecentActivity.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("emptyActivity")}</p>
        ) : (
          <ul className="divide-border divide-y">
            {mockRecentActivity.map((item, index) => {
              const Icon = actionIcons[item.actionKey];
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm">
                      {t(`activity.${item.actionKey}`, { name: item.actorName, target: item.targetLabel })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format.relativeTime(new Date(item.timestamp), new Date())}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
