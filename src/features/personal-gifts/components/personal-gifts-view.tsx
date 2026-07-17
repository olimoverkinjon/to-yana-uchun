"use client";

import { Gift, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { formatAmount, formatDate } from "@/shared/lib/format";

import {
  useCreatePersonalGiftMutation,
  useDeletePersonalGiftMutation,
  usePersonalGiftsQuery,
  useRestorePersonalGiftMutation,
} from "../hooks/use-personal-gifts";
import type { PersonalGiftFormOutput } from "../schemas/personal-gift-schema";
import type { PersonalGiftWithCurrency } from "../types";

import { PersonalGiftForm } from "./personal-gift-form";

export function PersonalGiftsView() {
  const t = useTranslations("personalGifts");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const query = usePersonalGiftsQuery();
  const createMutation = useCreatePersonalGiftMutation();
  const deleteMutation = useDeletePersonalGiftMutation();
  const restoreMutation = useRestorePersonalGiftMutation();
  const [confirming, setConfirming] = useState<PersonalGiftWithCurrency | null>(null);

  const handleSubmit = (values: PersonalGiftFormOutput) => {
    createMutation.mutate(values, {
      onSuccess: () => toast.success(t("created")),
      onError: () => toast.error(t("saveFailed")),
    });
  };

  const handleDelete = () => {
    if (!confirming) return;
    const target = confirming;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(t("deleted"), {
          duration: 10_000,
          action: {
            label: tCommon("undo"),
            onClick: () => restoreMutation.mutate(target.id),
          },
        });
        setConfirming(null);
      },
      onError: () => toast.error(t("deleteFailed")),
    });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Gift className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
        </div>
      </section>

      <PersonalGiftForm isPending={createMutation.isPending} onSubmit={handleSubmit} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("listTitle")}</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("count", { count: query.data?.length ?? 0 })}
          </span>
        </div>

        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.isLoading ? (
          <PersonalGiftSkeleton />
        ) : !query.data?.length ? (
          <EmptyState icon={Plus} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <div className="bg-card/80 overflow-hidden rounded-2xl border shadow-sm">
            <div className="bg-muted/35 text-muted-foreground hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(6rem,0.7fr)_2rem] px-4 py-2.5 text-xs font-medium sm:grid">
              <span>{t("table.event")}</span>
              <span>{t("table.gift")}</span>
              <span>{t("table.date")}</span>
              <span className="sr-only">{t("table.actions")}</span>
            </div>
            <ul className="divide-border/70 divide-y">
              {query.data.map((gift) => {
                const value =
                  gift.amount !== null && gift.currency
                    ? formatAmount(gift.amount, gift.currency, locale)
                    : (gift.description ?? "—");
                const description = gift.amount !== null && gift.description ? gift.description : null;

                return (
                  <li
                    key={gift.id}
                    className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(6rem,0.7fr)_2rem] sm:items-center sm:px-4"
                  >
                    <div className="min-w-0">
                      <MobileLabel>{t("table.event")}</MobileLabel>
                      <p className="truncate text-sm font-semibold">{gift.event_title}</p>
                      {gift.recipient_name ? (
                        <p className="text-muted-foreground truncate text-xs">{gift.recipient_name}</p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <MobileLabel>{t("table.gift")}</MobileLabel>
                      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
                      {description ? <p className="text-muted-foreground truncate text-xs">{description}</p> : null}
                    </div>
                    <div className="min-w-0">
                      <MobileLabel>{t("table.date")}</MobileLabel>
                      <p className="text-muted-foreground truncate text-sm tabular-nums">
                        {formatDate(gift.gift_date, locale)}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={t("delete")}
                        onClick={() => setConfirming(gift)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={t("deleteTitle")}
        description={t("deleteBody")}
        confirmLabel={t("delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground mb-1 block text-[0.68rem] font-medium tracking-wide uppercase sm:hidden">
      {children}
    </span>
  );
}

function PersonalGiftSkeleton() {
  return (
    <div className="bg-card/80 overflow-hidden rounded-2xl border">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="border-border/70 grid gap-3 border-b px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(6rem,0.7fr)_2rem] sm:items-center sm:px-4"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="hidden size-8 sm:block" />
        </div>
      ))}
    </div>
  );
}
