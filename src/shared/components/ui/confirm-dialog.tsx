"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  /**
   * Offer a free-text reason, stored on the audit entry for this change.
   * Optional to fill in — a required field here would just teach people to
   * type "x" to get past it.
   */
  withReason?: boolean;
  isPending?: boolean;
  onConfirm: (reason?: string) => void;
}

/**
 * The confirmation step for anything that changes what other people see.
 *
 * Every destructive action in this app is reversible — "delete" sets
 * deleted_at and nothing more — so the copy passed in should say so rather
 * than trying to frighten the user out of a mistake that costs nothing.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  withReason = false,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const [reason, setReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {withReason ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">
              {t("reasonLabel")}
              <span className="text-muted-foreground font-normal">({t("optional")})</span>
            </Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={2}
              maxLength={500}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={isPending}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {isPending ? t("saving") : (confirmLabel ?? t("confirm"))}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
