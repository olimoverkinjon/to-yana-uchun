import type { ActivityItem, DashboardStats } from "../types";

/** Phase 1 ships UI only — this stands in for the real aggregates until the schema lands. */
export const mockDashboardStats: DashboardStats = {
  totalEvents: 6,
  totalGifts: 214,
  totalCashByCurrency: [
    { currency: "UZS", amount: 148_500_000 },
    { currency: "USD", amount: 3200 },
  ],
};

export const mockRecentActivity: ActivityItem[] = [
  {
    id: "1",
    actorName: "Rustam aka",
    actionKey: "gift_added",
    targetLabel: "Aziz Karimov",
    timestamp: "2026-07-15T18:30:00.000Z",
  },
  {
    id: "2",
    actorName: "Rustam aka",
    actionKey: "gift_added",
    targetLabel: "Dilnoza Yusupova",
    timestamp: "2026-07-15T17:05:00.000Z",
  },
  {
    id: "3",
    actorName: "Rustam aka",
    actionKey: "event_created",
    targetLabel: "Aziz & Malika Wedding",
    timestamp: "2026-07-14T09:20:00.000Z",
  },
  {
    id: "4",
    actorName: "Rustam aka",
    actionKey: "gift_updated",
    targetLabel: "Sherzod Rahimov",
    timestamp: "2026-07-12T14:45:00.000Z",
  },
];
