export interface CashByCurrency {
  currency: string;
  symbol: string | null;
  amount: number;
}

export interface DashboardStats {
  totalEvents: number;
  totalGifts: number;
  totalGuests: number;
  /** One entry per currency, never blended into a single figure. */
  totalCashByCurrency: CashByCurrency[];
}
