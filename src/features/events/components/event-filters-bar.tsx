"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/features/auth";

import { useEventYearsQuery } from "../hooks/use-events";
import { EVENT_STATUSES } from "../schemas/event-schema";
import type { EventFilters, EventSortOption } from "../types";

const SORT_OPTIONS: EventSortOption[] = ["newest", "oldest", "alphabetical", "recently_updated"];

/** Select cannot hold "no value", so the sentinel stands in for "all". */
const ALL = "__all__";

interface EventFiltersBarProps {
  filters: EventFilters;
  /** The live input value; separate from filters.search, which is debounced. */
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onChange: (filters: EventFilters) => void;
}

export function EventFiltersBar({ filters, searchInput, onSearchInputChange, onChange }: EventFiltersBarProps) {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const { isSuperAdmin } = usePermissions();
  const years = useEventYearsQuery();

  const hasActiveFilters = Boolean(filters.search || filters.year || filters.status || filters.includeDeleted);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder={t("filters.searchPlaceholder")}
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

      {/*
        Scrolls sideways on a narrow phone rather than wrapping into a tall
        stack that pushes the list itself below the fold.
      */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Select
          value={filters.year ? String(filters.year) : ALL}
          onValueChange={(value) => onChange({ ...filters, year: value === ALL ? null : Number(value) })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allYears")}</SelectItem>
            {(years.data ?? []).map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) =>
            onChange({ ...filters, status: value === ALL ? null : (value as EventFilters["status"]) })
          }
        >
          <SelectTrigger size="sm" className="w-auto min-w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {EVENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort ?? "newest"}
          onValueChange={(value) => onChange({ ...filters, sort: value as EventSortOption })}
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

        {/*
          Only a Super Admin's RLS policy returns soft-deleted rows, so for
          anyone else this toggle would silently do nothing.
        */}
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
              onChange({ sort: filters.sort });
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
