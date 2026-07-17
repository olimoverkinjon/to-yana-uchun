"use client";

import { motion } from "framer-motion";
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatAmount, formatDate, formatWeight, initialsOf } from "@/shared/lib/format";

import type { GiftWithRelations } from "../types";

interface GiftRowProps {
  gift: GiftWithRelations;
  canManage: boolean;
  index?: number;
  onEdit: (gift: GiftWithRelations) => void;
  onDelete: (gift: GiftWithRelations) => void;
  onRestore: (gift: GiftWithRelations) => void;
}

/** One gift, as a responsive table row. */
export function GiftRow({ gift, canManage, index = 0, onEdit, onDelete, onRestore }: GiftRowProps) {
  const t = useTranslations("gifts");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const isDeleted = Boolean(gift.deleted_at);
  const isOptimistic = gift.id.startsWith("optimistic-");

  const recordedBy =
    [gift.created_by_profile?.first_name, gift.created_by_profile?.last_name].filter(Boolean).join(" ") ||
    gift.created_by_profile?.username ||
    null;

  const value =
    gift.amount !== null && gift.amount !== undefined
      ? formatAmount(gift.amount, gift.currency, locale)
      : gift.weight !== null && gift.weight !== undefined
        ? formatWeight(gift.weight, gift.unit, locale)
        : "—";

  const giftName = gift.description?.trim() || gift.gift_type?.name || t("table.notSpecified");

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.02, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "hover:bg-muted/35 group grid gap-3 px-3 py-3 transition-colors sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)_minmax(7rem,0.8fr)_minmax(6.5rem,0.7fr)_2rem] sm:items-center sm:px-4",
        isDeleted && "opacity-55",
        isOptimistic && "animate-pulse",
      )}
    >
      <div className="min-w-0">
        <MobileLabel>{t("table.giver")}</MobileLabel>
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-8 shrink-0 sm:size-9">
            <AvatarFallback className="text-xs font-medium">{initialsOf(gift.giver_name)}</AvatarFallback>
          </Avatar>
          <p className="text-foreground min-w-0 truncate text-sm font-semibold">{gift.giver_name}</p>
          {isDeleted ? (
            <Badge variant="destructive" className="shrink-0">
              {t("deletedBadge")}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <MobileLabel>{t("table.gift")}</MobileLabel>
        <p className="text-foreground truncate text-sm font-medium">{giftName}</p>
        <div className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {gift.gift_type ? <span className="truncate">{gift.gift_type.name}</span> : null}
          {recordedBy ? (
            <span className="hidden truncate sm:inline">{t("recordedBy", { name: recordedBy })}</span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <MobileLabel>{t("table.value")}</MobileLabel>
        <span className="text-foreground block truncate text-sm font-semibold tabular-nums">{value}</span>
      </div>

      <div className="min-w-0">
        <MobileLabel>{t("table.date")}</MobileLabel>
        <span className="text-muted-foreground block truncate text-sm tabular-nums">
          {formatDate(gift.gift_date, locale)}
        </span>
      </div>

      <div className="flex items-center justify-end">
        {canManage && !isOptimistic ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("table.actions")}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {isDeleted ? (
                <DropdownMenuItem onClick={() => onRestore(gift)}>
                  <RotateCcw className="mr-2 size-3.5" />
                  {tCommon("restore")}
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onEdit(gift)}>
                    <Pencil className="mr-2 size-3.5" />
                    {tCommon("edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(gift)}>
                    <Trash2 className="mr-2 size-3.5" />
                    {tCommon("delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </motion.li>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground mb-1 block text-[0.68rem] font-medium tracking-wide uppercase sm:hidden">
      {children}
    </span>
  );
}
