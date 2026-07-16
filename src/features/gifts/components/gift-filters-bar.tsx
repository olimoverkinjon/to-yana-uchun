"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/features/auth";
import { useReferenceData } from "@/features/reference-data";

import type { GiftFilters, GiftSortOption } from "../types";

const SORT_OPTIONS: GiftSortOption[] = ["newest", "oldest", "highest_amount", "lowest_amount", "alphabetical"];
const ALL = "__all__";

interface GiftFiltersBarProps {
  filters: GiftFilters;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onChange: (filters: GiftFilters) => void;
}

export function GiftFiltersBar({ filters, searchInput, onSearchInputChange, onChange }: GiftFiltersBarProps) {
  const t = useTranslations("gifts");
  const tCommon = useTranslations("common");
  const { isSuperAdmin } = usePermissions();
  const { giftTypes, currencies } = useReferenceData();

  const hasActiveFilters = Boolean(
    filters.search || filters.giftTypeId || filters.currencyId || filters.includeDeleted,
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 pr-9 pl-9"
          type="search"
          aria-label={tCommon("search")}
        />
        {searchInput ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onSearchInputChange("")}
            className="absolute top-1/2 right-2 -translate-y-1/2"
            aria-label={tCommon("clear")}
          >
            <X />
          </Button>
        ) : null}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Select
          value={filters.giftTypeId ?? ALL}
          onValueChange={(value) => onChange({ ...filters, giftTypeId: value === ALL ? null : value })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allTypes")}</SelectItem>
            {giftTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.currencyId ?? ALL}
          onValueChange={(value) => onChange({ ...filters, currencyId: value === ALL ? null : value })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allCurrencies")}</SelectItem>
            {currencies.map((currency) => (
              <SelectItem key={currency.id} value={currency.id}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort ?? "newest"}
          onValueChange={(value) => onChange({ ...filters, sort: value as GiftSortOption })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`sort.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isSuperAdmin ? (
          <Button
            variant={filters.includeDeleted ? "secondary" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => onChange({ ...filters, includeDeleted: !filters.includeDeleted })}
          >
            {t("filters.showDeleted")}
          </Button>
        ) : null}

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => {
              onSearchInputChange("");
              onChange({ eventId: filters.eventId, sort: filters.sort });
            }}
          >
            <X className="mr-1" />
            {tCommon("clearAll")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
