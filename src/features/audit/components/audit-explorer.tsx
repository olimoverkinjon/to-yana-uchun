"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/shared/components/ui/infinite-scroll-sentinel";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useAuditLogsInfiniteQuery } from "../hooks/use-audit-logs";
import type { AuditFilters } from "../types";
import { AuditLogCard } from "./audit-log-card";

export function AuditExplorer({ initialFilters = {} }: { initialFilters?: AuditFilters }) {
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  );
  const query = useAuditLogsInfiniteQuery(activeFilters);
  const logs = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="glass-panel grid gap-2 rounded-xl p-3 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search user, Telegram ID, event, gift, action, IP"
            className="pl-9"
          />
        </div>
        <select
          value={filters.action ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value || undefined }))}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          <option value="INSERT">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="RESTORE">Restore</option>
        </select>
        <select
          value={filters.table ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, table: event.target.value || undefined }))}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All tables</option>
          <option value="events">Events</option>
          <option value="gifts">Gifts</option>
          <option value="user_roles">Roles</option>
          <option value="settings">Settings</option>
          <option value="profiles">Users</option>
        </select>
        <select
          value={filters.severity ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value || undefined }))}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <div className="flex overflow-hidden rounded-lg border">
          {(["csv", "xlsx", "pdf"] as const).map((format) => (
            <a
              key={format}
              href={`/api/audit/export?format=${format}&${new URLSearchParams(Object.entries(activeFilters).filter(([, value]) => Boolean(value)) as [string, string][]).toString()}`}
              className="hover:bg-muted flex-1 px-2 py-2 text-center text-xs font-medium uppercase transition-colors"
            >
              {format}
            </a>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <AuditSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No audit logs found"
          body="Try widening the date, action, table or severity filters."
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <AuditLogCard key={log.id} log={log} />
          ))}
          {query.isFetchingNextPage ? <AuditSkeleton count={2} /> : null}
          <InfiniteScrollSentinel
            disabled={!query.hasNextPage || query.isFetchingNextPage}
            onIntersect={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
          />
        </div>
      )}
    </div>
  );
}

function AuditSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="glass-panel rounded-xl p-4">
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
