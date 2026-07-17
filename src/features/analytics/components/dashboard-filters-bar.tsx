"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEventYearsQuery, useEventsInfiniteQuery } from "@/features/events";
import { useReferenceData } from "@/features/reference-data";

import type { DashboardFilterState } from "../hooks/use-dashboard-filters";

const ALL = "__all__";

/**
 * The dashboard's filters.
 *
 * Behind a popover rather than laid out across the top: six controls would
 * out-height the first card on a phone, and the dashboard's job is to lead
 * with the numbers. The trigger carries a count so an active filter is never
 * hidden — the one real risk of tucking filters away is a reader trusting a
 * figure without noticing it is narrowed.
 */
export function DashboardFiltersBar({ state }: { state: DashboardFilterState }) {
  const t = useTranslations("dashboard.filters");
  const tCommon = useTranslations("common");
  const { filters, activeCount, isFiltered, set, setRange, reset } = state;

  const years = useEventYearsQuery();
  const { giftTypes, currencies } = useReferenceData();
  // Enough to pick from without paginating; the event filter is for choosing a
  // specific wedding, and a family with more than 50 reaches for search first.
  const events = useEventsInfiniteQuery({ sort: "newest" });
  const eventOptions = events.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-1.5" />
              {t("title")}
              {activeCount > 0 ? (
                <Badge variant="secondary" className="ml-1.5">
                  {activeCount}
                </Badge>
              ) : null}
            </Button>
          }
        />

        <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("year")}</Label>
            <Select
              value={filters.year ? String(filters.year) : ALL}
              onValueChange={(value) => set("year", value === ALL ? null : Number(value))}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allYears")}</SelectItem>
                {(years.data ?? []).map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("event")}</Label>
            <Select
              value={filters.eventId ?? eventOptions[0]?.id ?? ALL}
              onValueChange={(value) => {
                if (value !== ALL) set("eventId", value);
              }}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventOptions.length === 0 ? <SelectItem value={ALL}>{t("chooseEvent")}</SelectItem> : null}
                {eventOptions.map((event) => (
                  <SelectItem key={event.id} value={event.id!}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("giftType")}</Label>
            <Select
              value={filters.giftTypeId ?? ALL}
              onValueChange={(value) => set("giftTypeId", value === ALL ? null : value)}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allTypes")}</SelectItem>
                {giftTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("currency")}</Label>
            <Select
              value={filters.currencyId ?? ALL}
              onValueChange={(value) => set("currencyId", value === ALL ? null : value)}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allCurrencies")}</SelectItem>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("dateRange")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.from ?? ""}
                onChange={(event) => setRange(event.target.value || null, filters.to ?? null)}
                className="h-8"
                aria-label={t("from")}
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="date"
                value={filters.to ?? ""}
                onChange={(event) => setRange(filters.from ?? null, event.target.value || null)}
                className="h-8"
                aria-label={t("to")}
              />
            </div>
          </div>

          {isFiltered ? (
            <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
              <X className="mr-1" />
              {t("reset")}
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>

      {isFiltered ? (
        <Button variant="ghost" size="sm" onClick={reset}>
          {tCommon("clearAll")}
        </Button>
      ) : null}
    </div>
  );
}
