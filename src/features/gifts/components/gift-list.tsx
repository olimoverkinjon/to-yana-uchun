"use client";

import { Gift as GiftIcon, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { InfiniteScrollSentinel } from "@/shared/components/ui/infinite-scroll-sentinel";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { toAppError } from "@/shared/lib/errors";

import { useDeleteGiftMutation, useRestoreGiftMutation } from "../hooks/use-gift-mutations";
import { useGiftsInfiniteQuery } from "../hooks/use-gifts";
import type { GiftFilters, GiftWithRelations } from "../types";

import { GiftFiltersBar } from "./gift-filters-bar";
import { GiftFormSheet } from "./gift-form-sheet";
import { GiftRow } from "./gift-row";

interface GiftListProps {
  eventId: string;
  /** False once the parent event is deleted — nothing can be added to it. */
  canManage: boolean;
}

export function GiftList({ eventId, canManage }: GiftListProps) {
  const t = useTranslations("gifts");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { isSuperAdmin } = usePermissions();

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<GiftFilters>({ eventId, sort: "newest" });
  const [editing, setEditing] = useState<GiftWithRelations | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirming, setConfirming] = useState<{ gift: GiftWithRelations; action: "delete" | "restore" } | null>(null);

  // Instant search: the input drives itself, the debounced value drives the
  // query, and keepPreviousData (in the hook) keeps the current results on
  // screen while the next request runs. The list never blanks out mid-type.
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const activeFilters = useMemo<GiftFilters>(
    () => ({ ...filters, eventId, search: debouncedSearch.trim() || undefined }),
    [filters, eventId, debouncedSearch],
  );

  const query = useGiftsInfiniteQuery(activeFilters);
  const deleteMutation = useDeleteGiftMutation();
  const restoreMutation = useRestoreGiftMutation();

  const gifts = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.totalCount ?? 0;
  const hasFiltersApplied = Boolean(
    activeFilters.search || activeFilters.giftTypeId || activeFilters.currencyId || activeFilters.includeDeleted,
  );

  const onError = (error: unknown) => toast.error(tErrors(toAppError(error).code));

  const handleConfirm = (reason?: string) => {
    if (!confirming) return;
    const { gift, action } = confirming;

    if (action === "delete") {
      deleteMutation.mutate(
        { id: gift.id, eventId, reason },
        {
          onSuccess: () => {
            toast.success(t("actions.deleted"));
            setConfirming(null);
          },
          onError,
        },
      );
    } else {
      restoreMutation.mutate(
        { id: gift.id, reason },
        {
          onSuccess: () => {
            toast.success(t("actions.restored"));
            setConfirming(null);
          },
          onError,
        },
      );
    }
  };

  const canEdit = isSuperAdmin && canManage;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">{t("title")}</h2>
        {canEdit ? (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="mr-1" />
            {t("add")}
          </Button>
        ) : null}
      </div>

      <GiftFiltersBar
        filters={filters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onChange={setFilters}
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <GiftListSkeleton />
      ) : gifts.length === 0 ? (
        <EmptyState
          icon={GiftIcon}
          title={hasFiltersApplied ? t("emptyFiltered") : t("empty")}
          body={hasFiltersApplied ? t("emptyFilteredBody") : t("emptyBody")}
          action={
            !hasFiltersApplied && canEdit ? (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-1.5" />
                {t("add")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {/*
            Dimmed while a background refetch runs (keepPreviousData means the
            old results are still on screen) — honest that these may be about
            to change, without yanking them away.
          */}
          <ul className={query.isFetching && !query.isFetchingNextPage ? "opacity-60 transition-opacity" : undefined}>
            {gifts.map((gift, index) => (
              <GiftRow
                key={gift.id}
                gift={gift}
                index={index}
                canManage={canEdit}
                onEdit={setEditing}
                onDelete={(target) => setConfirming({ gift: target, action: "delete" })}
                onRestore={(target) => setConfirming({ gift: target, action: "restore" })}
              />
            ))}
          </ul>

          {query.isFetchingNextPage ? <GiftListSkeleton count={3} /> : null}

          <InfiniteScrollSentinel
            onIntersect={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
            disabled={!query.hasNextPage || query.isFetchingNextPage}
          />

          {!query.hasNextPage ? (
            <p className="text-muted-foreground pt-1 text-center text-xs tabular-nums">
              {tCommon("showing", { count: gifts.length, total })}
            </p>
          ) : null}
        </>
      )}

      <GiftFormSheet open={isAdding} onOpenChange={setIsAdding} eventId={eventId} />
      <GiftFormSheet
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        eventId={eventId}
        gift={editing}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming?.action === "delete" ? t("actions.deleteTitle") : t("actions.restoreTitle")}
        description={confirming?.action === "delete" ? t("actions.deleteBody") : t("actions.restoreBody")}
        confirmLabel={confirming?.action === "delete" ? tCommon("delete") : tCommon("restore")}
        variant={confirming?.action === "delete" ? "destructive" : "default"}
        withReason
        isPending={deleteMutation.isPending || restoreMutation.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function GiftListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
