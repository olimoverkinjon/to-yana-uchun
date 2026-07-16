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

/**
 * One gift, as a row.
 *
 * The layout is a list rather than a table even on desktop: a gift's shape
 * varies by type — cash has an amount, a cow has a weight, a refrigerator has
 * neither — so a fixed column grid would be mostly empty cells. The value line
 * shows whichever measure that gift actually has.
 */
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
        : (gift.description ?? "—");

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.02, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "hover:bg-muted/40 group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
        isDeleted && "opacity-55",
        // The row is live but not yet confirmed by the server; a subtle pulse
        // is honest about that without blocking the next entry.
        isOptimistic && "animate-pulse",
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="text-xs font-medium">{initialsOf(gift.giver_name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-foreground truncate text-sm font-medium">{gift.giver_name}</p>
          {isDeleted ? (
            <Badge variant="destructive" className="shrink-0">
              {t("deletedBadge")}
            </Badge>
          ) : null}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {gift.gift_type ? <span className="truncate">{gift.gift_type.name}</span> : null}
          <span aria-hidden>·</span>
          <span className="tabular-nums">{formatDate(gift.gift_date, locale)}</span>
          {recordedBy ? (
            <>
              <span aria-hidden className="hidden sm:inline">
                ·
              </span>
              <span className="hidden truncate sm:inline">{t("recordedBy", { name: recordedBy })}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="text-foreground max-w-[9rem] truncate text-sm font-semibold tabular-nums">{value}</span>

        {canManage && !isOptimistic ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={tCommon("edit")}
                  // Always reachable on touch, where there is no hover.
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
