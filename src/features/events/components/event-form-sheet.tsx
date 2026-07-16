"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ResponsiveSheet } from "@/shared/components/ui/responsive-sheet";
import { toAppError } from "@/shared/lib/errors";

import { useCreateEventMutation, useUpdateEventMutation } from "../hooks/use-event-mutations";
import type { EventFormOutput } from "../schemas/event-schema";
import type { EventSummaryRow } from "../types";

import { EventForm } from "./event-form";

interface EventFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent = create. Present = edit that event. */
  event?: EventSummaryRow | null;
  /** Navigate to the new event after creating it. */
  navigateOnCreate?: boolean;
}

/**
 * Connects EventForm to the mutations and reports the outcome.
 *
 * The form itself stays unaware of TanStack Query, server actions, and
 * routing — it takes values in and hands values out, which is what makes it
 * the same component for create and edit.
 */
export function EventFormSheet({ open, onOpenChange, event, navigateOnCreate = false }: EventFormSheetProps) {
  const t = useTranslations("events");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();

  const isEditing = Boolean(event);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleError = (error: unknown) => {
    toast.error(tErrors(toAppError(error).code));
  };

  const handleSubmit = (values: EventFormOutput) => {
    if (event) {
      updateMutation.mutate(
        { id: event.id!, values },
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
      { values },
      {
        onSuccess: (created) => {
          toast.success(t("actions.created"));
          onOpenChange(false);
          if (navigateOnCreate) router.push(`/events/${created.id}`);
        },
        onError: handleError,
      },
    );
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        // Closing mid-save would leave the user with no idea whether it
        // landed, and the optimistic rollback would have nothing to attach to.
        if (isPending) return;
        onOpenChange(next);
      }}
      title={isEditing ? t("editTitle") : t("createTitle")}
      className="sm:max-w-lg"
    >
      <EventForm
        // Remounts on switching between create and different events, so the
        // form's defaultValues are re-read rather than showing the last
        // event's data in a "new event" sheet.
        key={event?.id ?? "new"}
        event={event}
        isPending={isPending}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
}
