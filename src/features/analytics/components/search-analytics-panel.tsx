"use client";

import { Eye, Search, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSearchAnalyticsQuery } from "../hooks/use-analytics";

/**
 * What people have been looking for.
 *
 * Reads real rows from activity_logs, which the app writes when a search is
 * run or an event is opened. Super-Admin-only, and not because the numbers are
 * sensitive — because they are a record of what individuals did, which is a
 * different kind of data from the ledger itself. The RPC enforces that too; it
 * returns empty arrays rather than one user's history to another.
 */
export function SearchAnalyticsPanel() {
  const t = useTranslations("dashboard.searchAnalytics");
  const query = useSearchAnalyticsQuery();

  const data = query.data;

  return (
    <Card className="glass-panel gap-0 border-0 py-0 ring-0">
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Search className="size-3.5" />
          {t("title")}
        </CardTitle>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </CardHeader>

      <CardContent className="p-3 pt-1 sm:p-4 sm:pt-1">
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="terms">
            <TabsList className="w-full">
              <TabsTrigger value="terms" className="flex-1 text-xs">
                {t("topTerms")}
              </TabsTrigger>
              <TabsTrigger value="events" className="flex-1 text-xs">
                {t("mostOpened")}
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1 text-xs">
                {t("recent")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terms" className="pt-3">
              {!data?.topSearchTerms.length ? (
                <Empty message={t("emptyTerms")} />
              ) : (
                <ul className="space-y-1">
                  {data.topSearchTerms.map((term) => (
                    <li
                      key={term.query}
                      className="hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <TrendingUp className="text-muted-foreground size-3 shrink-0" />
                        <span className="text-foreground truncate text-xs">{term.query}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {t("searchCount", { count: term.search_count })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="events" className="pt-3">
              {!data?.mostOpenedEvents.length ? (
                <Empty message={t("emptyEvents")} />
              ) : (
                <ul className="space-y-1">
                  {data.mostOpenedEvents.map((event) => (
                    <li key={event.event_id}>
                      <Link
                        href={`/events/${event.event_id}`}
                        className="hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Eye className="text-muted-foreground size-3 shrink-0" />
                          <span className="text-foreground truncate text-xs">{event.title}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {t("viewCount", { count: event.view_count })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="recent" className="pt-3">
              {!data?.recentSearches.length ? (
                <Empty message={t("emptyRecent")} />
              ) : (
                <ul className="flex flex-wrap gap-1.5 px-1">
                  {data.recentSearches.map((search, index) => (
                    <li
                      key={`${search.query}-${index}`}
                      className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs"
                    >
                      {search.query}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="text-muted-foreground px-2 py-6 text-center text-xs">{message}</p>;
}
