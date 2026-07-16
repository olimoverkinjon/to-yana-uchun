export interface CashByCurrency {
  currency: string;
  amount: number;
}

export interface DashboardStats {
  totalEvents: number;
  totalGifts: number;
  /** Never blended into one number across currencies — see PRD business rule §7.3. */
  totalCashByCurrency: CashByCurrency[];
}

export interface ActivityItem {
  id: string;
  actorName: string;
  actionKey: "gift_added" | "gift_updated" | "event_created";
  targetLabel: string;
  timestamp: string;
}
