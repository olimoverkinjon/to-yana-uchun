import type { Database } from "@/lib/supabase/types";

export type GiftRow = Database["public"]["Tables"]["gifts"]["Row"];

/** The shape the gift list renders: a gift plus its joined display data. */
export interface GiftWithRelations extends GiftRow {
  gift_type: Pick<Database["public"]["Tables"]["gift_types"]["Row"], "id" | "name" | "slug" | "icon"> | null;
  currency: Pick<Database["public"]["Tables"]["currencies"]["Row"], "id" | "code" | "symbol"> | null;
  created_by_profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "first_name" | "last_name" | "username" | "photo_url"
  > | null;
}

export type GiftSortOption = "newest" | "oldest" | "highest_amount" | "lowest_amount" | "alphabetical";

export interface GiftFilters {
  eventId?: string;
  /** Free-text query matched against giver name, description and notes. */
  search?: string;
  giftTypeId?: string | null;
  currencyId?: string | null;
  year?: number | null;
  includeDeleted?: boolean;
  sort?: GiftSortOption;
}

export interface GiftListPage {
  items: GiftWithRelations[];
  nextOffset: number | null;
  totalCount: number;
}
