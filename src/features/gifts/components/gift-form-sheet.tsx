"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useReferenceData } from "@/features/reference-data";
import { ResponsiveSheet } from "@/shared/components/ui/responsive-sheet";
import { toAppError } from "@/shared/lib/errors";

import { useCreateGiftMutation, useUpdateGiftMutation } from "../hooks/use-gift-mutations";
import type { GiftFormOutput } from "../schemas/gift-schema";
import type { GiftWithRelations } from "../types";

import { GiftForm } from "./gift-form";

interface GiftFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  /** Absent = add. Present = edit that gift. */
  gift?: GiftWithRelations | null;
}

export function GiftFormSheet({ open, onOpenChange, eventId, gift }: GiftFormSheetProps) {
  const t = useTranslations("gifts");
  const tErrors = useTranslations("errors");
  const { giftTypeById, currencyById } = useReferenceData();

  const createMutation = useCreateGiftMutation();
  const updateMutation = useUpdateGiftMutation();

  const isEditing = Boolean(gift);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleError = (error: unknown) => toast.error(tErrors(toAppError(error).code));

  const handleSubmit: React.ComponentProps<typeof GiftForm>["onSubmit"] = (values: GiftFormOutput, meta) => {
    if (gift) {
      updateMutation.mutate(
        { id: gift.id, values },
        {
          onSuccess: () => {
            toast.success(t("actions.updated"));
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
      return;
    }

    createMutation.mutate(
      {
        eventId,
        values,
        // Passed so the optimistic row can show a real type/currency label
        // instead of a blank while the insert is in flight. Not sent to the
        // server — it re-reads both from the ids.
        giftType: giftTypeById.get(meta.giftTypeId),
        currency: meta.currencyId ? currencyById.get(meta.currencyId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("actions.created"));
          onOpenChange(false);
        },
        onError: handleError,
      },
    );
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
      title={isEditing ? t("editTitle") : t("addTitle")}
      className="sm:max-w-lg"
    >
      <GiftForm
        key={gift?.id ?? "new"}
        gift={gift}
        isPending={isPending}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
}
