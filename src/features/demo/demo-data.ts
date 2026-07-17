import type { AdminHomeStats, AdminList, AdminUser, AttachmentRow, RoleRow, SettingRow } from "@/features/admin/types";
import type { CashSlice, GrowthPoint, MonthPoint } from "@/features/analytics/api/analytics-repository";
import type { DashboardTotals, GlobalAverages, TopContributor } from "@/features/analytics/types";
import type { AuditLogRow, AuditPage, AuditStatistic } from "@/features/audit/types";
import type { Permissions } from "@/features/auth/types";
import type {
  EventCashTotalRow,
  EventGiftTypeTotalRow,
  EventListPage,
  EventRow,
  EventSummaryRow,
} from "@/features/events/types";
import type { GiftListPage, GiftWithRelations } from "@/features/gifts/types";
import type { CurrencyRow, GiftTypeRow } from "@/features/reference-data";

export const demoProfileId = "00000000-0000-4000-8000-000000000001";
export const demoEventId = "00000000-0000-4000-8000-000000000101";
export const demoGiftId = "00000000-0000-4000-8000-000000000201";
export const demoCashTypeId = "00000000-0000-4000-8000-000000000301";
export const demoGoldTypeId = "00000000-0000-4000-8000-000000000302";
export const demoUsdId = "00000000-0000-4000-8000-000000000401";
export const demoUzsId = "00000000-0000-4000-8000-000000000402";

const now = new Date().toISOString();

export const demoPermissions: Permissions = {
  isSuperAdmin: true,
  hasAccess: true,
  roles: ["super_admin"],
};

export const demoRoles: RoleRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000501",
    name: "super_admin",
    description: "Full access",
    created_at: now,
    updated_at: now,
  },
  {
    id: "00000000-0000-4000-8000-000000000502",
    name: "viewer",
    description: "Read-only access",
    created_at: now,
    updated_at: now,
  },
];

export const demoUsers: AdminUser[] = [
  {
    id: demoProfileId,
    telegram_id: 7990560340,
    username: "local_admin",
    first_name: "Local",
    last_name: "Admin",
    photo_url: null,
    language_code: "uz",
    is_premium: false,
    last_seen_at: now,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    roles: [demoRoles[0]],
  },
] as AdminUser[];

export const demoCurrencies: CurrencyRow[] = [
  {
    id: demoUzsId,
    code: "UZS",
    symbol: "so'm",
    name: "Uzbekistani Som",
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
  {
    id: demoUsdId,
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
] as CurrencyRow[];

export const demoGiftTypes: GiftTypeRow[] = [
  {
    id: demoCashTypeId,
    slug: "cash",
    name: "Cash",
    icon: "banknote",
    category: "cash",
    requires_amount: true,
    requires_currency: true,
    requires_weight: false,
    sort_order: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    is_system: true,
  },
  {
    id: demoGoldTypeId,
    slug: "gold",
    name: "Gold",
    icon: "gem",
    category: "gold",
    requires_amount: false,
    requires_currency: false,
    requires_weight: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    is_system: true,
  },
];

export const demoEventRow: EventRow = {
  id: demoEventId,
  title: "Local Demo Wedding",
  description: "Fully local demo event for frontend, backend routes and admin screens.",
  bride_name: "Madina",
  groom_name: "Aziz",
  event_date: "2026-07-17",
  event_year: 2026,
  location: "Tashkent",
  cover_image: null,
  status: "active",
  created_by: demoProfileId,
  updated_by: null,
  created_at: now,
  updated_at: now,
  deleted_at: null,
  search_vector: "",
};

export const demoEvents: EventSummaryRow[] = [
  {
    id: demoEventId,
    title: "Local Demo Wedding",
    description: "Fully local demo event for frontend, backend routes and admin screens.",
    bride_name: "Madina",
    groom_name: "Aziz",
    event_date: "2026-07-17",
    event_year: 2026,
    location: "Tashkent",
    cover_image: null,
    status: "active",
    created_by: demoProfileId,
    updated_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    gift_count: 3,
  },
];

export const demoGifts: GiftWithRelations[] = [
  {
    id: demoGiftId,
    event_id: demoEventId,
    giver_name: "Rustam Karimov",
    gift_type_id: demoCashTypeId,
    amount: 2500000,
    currency_id: demoUzsId,
    weight: null,
    unit: null,
    description: "Cash gift",
    gift_date: "2026-07-17",
    notes: "Local demo record",
    created_by: demoProfileId,
    updated_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    gift_type: { id: demoCashTypeId, name: "Cash", slug: "cash", icon: "banknote" },
    currency: { id: demoUzsId, code: "UZS", symbol: "so'm" },
    created_by_profile: {
      id: demoProfileId,
      first_name: "Local",
      last_name: "Admin",
      username: "local_admin",
      photo_url: null,
    },
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    event_id: demoEventId,
    giver_name: "Dilnoza Ahmedova",
    gift_type_id: demoGoldTypeId,
    amount: null,
    currency_id: null,
    weight: 12.5,
    unit: "g",
    description: "Gold bracelet",
    gift_date: "2026-07-17",
    notes: null,
    created_by: demoProfileId,
    updated_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    gift_type: { id: demoGoldTypeId, name: "Gold", slug: "gold", icon: "gem" },
    currency: null,
    created_by_profile: {
      id: demoProfileId,
      first_name: "Local",
      last_name: "Admin",
      username: "local_admin",
      photo_url: null,
    },
  },
] as GiftWithRelations[];

export const demoDashboardTotals: DashboardTotals = {
  totalEvents: 1,
  totalGifts: 3,
  totalContributors: 3,
  cashTotals: [
    { currency_code: "UZS", currency_symbol: "so'm", total_amount: 2500000 },
    { currency_code: "USD", currency_symbol: "$", total_amount: 300 },
  ],
  goldWeight: 12.5,
  livestockCount: 0,
  otherCount: 1,
  lastUpdated: now,
  trends: { events: 12, gifts: 24, contributors: 18, cash: 16, gold: 8, livestock: null, other: 5 },
};

export const demoGlobalAverages: GlobalAverages = {
  totalEvents: 1,
  totalGifts: 3,
  totalPeople: 3,
  avgGiftsPerEvent: 3,
  avgContributorsPerEvent: 3,
  avgCashPerEvent: demoDashboardTotals.cashTotals,
  avgLivestockPerEvent: 0,
  avgGoldPerEvent: 12.5,
};

export const demoAuditLogs: AuditLogRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000701",
    created_at: now,
    action: "INSERT",
    table_name: "events",
    record_id: demoEventId,
    changed_by: demoProfileId,
    telegram_user_id: 7990560340,
    actor_role: "super_admin",
    actor_first_name: "Local",
    actor_last_name: "Admin",
    actor_username: "local_admin",
    old_data: null,
    new_data: { title: "Local Demo Wedding" },
    changed_fields: ["title"],
    reason: "Local demo seed",
    ip_address: "127.0.0.1",
    user_agent: "Local Demo",
    browser: "Local",
    os: "Windows",
    device: "Desktop",
    session_id: null,
    request_id: null,
    related_event_id: demoEventId,
    related_gift_id: null,
    event_title: "Local Demo Wedding",
    gift_giver_name: null,
    severity: "info",
  },
];

export function demoEventPage(offset = 0, limit = 12): EventListPage {
  const items = demoEvents.slice(offset, offset + limit);
  return {
    items,
    totalCount: demoEvents.length,
    nextOffset: offset + items.length < demoEvents.length ? offset + items.length : null,
  };
}

export function demoGiftPage(offset = 0, limit = 20): GiftListPage {
  const items = demoGifts.slice(offset, offset + limit);
  return {
    items,
    totalCount: demoGifts.length,
    nextOffset: offset + items.length < demoGifts.length ? offset + items.length : null,
  };
}

export const demoEventCashTotals: EventCashTotalRow[] = [
  {
    event_id: demoEventId,
    currency_id: demoUzsId,
    currency_code: "UZS",
    currency_symbol: "so'm",
    total_amount: 2500000,
  },
  { event_id: demoEventId, currency_id: demoUsdId, currency_code: "USD", currency_symbol: "$", total_amount: 300 },
] as EventCashTotalRow[];

export const demoEventGiftTypeTotals: EventGiftTypeTotalRow[] = [
  {
    event_id: demoEventId,
    gift_type_id: demoCashTypeId,
    gift_type_name: "Cash",
    gift_type_slug: "cash",
    gift_count: 2,
    total_weight: null,
  },
  {
    event_id: demoEventId,
    gift_type_id: demoGoldTypeId,
    gift_type_name: "Gold",
    gift_type_slug: "gold",
    gift_count: 1,
    total_weight: 12.5,
  },
] as EventGiftTypeTotalRow[];

export function demoAdminHomeStats(): AdminHomeStats {
  return {
    totalEvents: demoEvents.length,
    totalGifts: demoGifts.length,
    totalUsers: demoUsers.length,
    totalAuditLogs: demoAuditLogs.length,
    recentEvents: demoEvents as never,
    recentGifts: demoGifts as never,
    recentActivity: [
      {
        id: "00000000-0000-4000-8000-000000000801",
        user_id: demoProfileId,
        action: "login",
        metadata: {},
        ip_address: "127.0.0.1",
        user_agent: "Local Demo",
        created_at: now,
      },
    ] as never,
    system: {
      database: "healthy",
      realtime: "healthy",
      storage: "healthy",
      auth: "healthy",
      api: "healthy",
      version: "0.1.0-local-demo",
    },
  };
}

export function demoAdminList<T>(items: T[], page = 1, pageSize = 25): AdminList<T> {
  return { items, totalCount: items.length, page, pageSize };
}

export const demoSettings: SettingRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000901",
    key: "local_demo_mode",
    value: true,
    description: "Local demo mode is active",
    updated_by: demoProfileId,
    created_at: now,
    updated_at: now,
  },
] as SettingRow[];

export const demoAttachments: AttachmentRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000902",
    event_id: demoEventId,
    gift_id: null,
    storage_bucket: "attachments",
    storage_path: "demo/local.pdf",
    file_name: "local-demo.pdf",
    mime_type: "application/pdf",
    file_size: 102400,
    uploaded_by: demoProfileId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
] as AttachmentRow[];

export function demoAuditPage(limit = 30): AuditPage {
  return { items: demoAuditLogs.slice(0, limit), nextCursor: null };
}

export const demoAuditStats: AuditStatistic[] = [
  { label: "Most Active Admin", value: "Local Admin", detail: "4 changes" },
  { label: "Most Edited Event", value: "Local Demo Wedding", detail: "2 changes", href: `/events/${demoEventId}` },
  { label: "Most Edited Gift", value: "Rustam Karimov", detail: "1 change" },
  { label: "Most Active Day", value: "2026-07-17", detail: "4 changes" },
  { label: "Most Common Action", value: "INSERT", detail: "3 changes" },
];

export const demoMonths: MonthPoint[] = [
  { bucket: "2026-05-01", giftCount: 1, contributors: 1 },
  { bucket: "2026-06-01", giftCount: 2, contributors: 2 },
  { bucket: "2026-07-01", giftCount: 3, contributors: 3 },
];

export const demoGrowth: GrowthPoint[] = [
  { bucket: "2026-05-01", totalContributors: 1, newContributors: 1 },
  { bucket: "2026-06-01", totalContributors: 2, newContributors: 1 },
  { bucket: "2026-07-01", totalContributors: 3, newContributors: 1 },
];

export const demoCashDistribution: CashSlice[] = [
  { currencyId: demoUzsId, code: "UZS", symbol: "so'm", totalAmount: 2500000, giftCount: 1, countSharePct: 50 },
  { currencyId: demoUsdId, code: "USD", symbol: "$", totalAmount: 300, giftCount: 1, countSharePct: 50 },
];

export const demoTopContributors: TopContributor[] = [
  {
    giverName: "Rustam Karimov",
    giftCount: 1,
    cashTotals: [{ currency_code: "UZS", currency_symbol: "so'm", total_amount: 2500000 }],
    lastGiftDate: "2026-07-17",
    eventCount: 1,
  },
  { giverName: "Dilnoza Ahmedova", giftCount: 1, cashTotals: [], lastGiftDate: "2026-07-17", eventCount: 1 },
];
