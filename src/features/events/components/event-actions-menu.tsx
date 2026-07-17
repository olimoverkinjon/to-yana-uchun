"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/features/auth";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { toAppError } from "@/shared/lib/errors";

import {
  useDeleteEventMutation,
  useRestoreEventMutation,
  useSetEventStatusMutation,
} from "../hooks/use-event-mutations";
import type { EventSummaryRow } from "../types";

interface EventActionsMenuProps {
  event: EventSummaryRow;
  onEdit: () => void;
  /** Where to go after a delete removes the event from view. */
  onDeleted?: () => void;
}

type PendingAction = "delete" | "restore" | "archive" | null;

/**
 * Edit / archive / delete / restore for one event.
 *
 * Rendered only for a Super Admin — but that is presentation, not security.
 * Every action here calls a server action that re-checks the role, and lands
 * on RLS policies that reject the write regardless of what this component
 * decided to show. A Viewer who somehow reached these controls would simply
 * get a "forbidden" toast.
 */
export function EventActionsMenu({ event, onEdit, onDeleted }: EventActionsMenuProps) {
  const t = useTranslations("events.actions");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { isSuperAdmin } = usePermissions();

  const [pending, setPending] = useState<PendingAction>(null);

  const deleteMutation = useDeleteEventMutation();
  const restoreMutation = useRestoreEventMutation();
  const statusMutation = useSetEventStatusMutation();

  if (!isSuperAdmin) return null;

  const isDeleted = Boolean(event.deleted_at);
  const isArchived = event.status === "archived";
  const onError = (error: unknown) => toast.error(tErrors(toAppError(error).code));

  const handleDelete = (reason?: string) => {
    deleteMutation.mutate(
      { id: event.id!, reason },
      {
        onSuccess: () => {
          toast.success(t("deleted"), {
            duration: 10_000,
            action: {
              label: tCommon("undo"),
              onClick: () => {
                restoreMutation.mutate({ id: event.id!, reason: "Undo delete" }, { onError });
              },
            },
          });
          setPending(null);
          onDeleted?.();
        },
        onError,
      },
    );
  };

  const handleRestore = (reason?: string) => {
    restoreMutation.mutate(
      { id: event.id!, reason },
      {
        onSuccess: () => {
          toast.success(t("restored"), {
            duration: 10_000,
            action: {
              label: tCommon("undo"),
              onClick: () => {
                deleteMutation.mutate({ id: event.id!, reason: "Undo restore" }, { onError });
              },
            },
          });
          setPending(null);
        },
        onError,
      },
    );
  };

  const handleArchiveToggle = (reason?: string) => {
    const next = isArchived ? "active" : "archived";
    statusMutation.mutate(
      { id: event.id!, status: next, reason },
      {
        onSuccess: () => {
          toast.success(next === "archived" ? t("archived") : t("unarchived"));
          setPending(null);
        },
        onError,
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={tCommon("edit")}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          {!isDeleted ? (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 size-3.5" />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPending("archive")}>
                {isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 size-3.5" />
                    {tCommon("unarchive")}
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 size-3.5" />
                    {tCommon("archive")}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setPending("delete")}>
                <Trash2 className="mr-2 size-3.5" />
                {tCommon("delete")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setPending("restore")}>
              <RotateCcw className="mr-2 size-3.5" />
              {tCommon("restore")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={pending === "delete"}
        onOpenChange={(open) => !open && setPending(null)}
        title={t("deleteTitle")}
        description={t("deleteBody")}
        confirmLabel={tCommon("delete")}
        variant="destructive"
        withReason
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={pending === "restore"}
        onOpenChange={(open) => !open && setPending(null)}
        title={t("restoreTitle")}
        description={t("restoreBody")}
        confirmLabel={tCommon("restore")}
        withReason
        isPending={restoreMutation.isPending}
        onConfirm={handleRestore}
      />

      <ConfirmDialog
        open={pending === "archive"}
        onOpenChange={(open) => !open && setPending(null)}
        title={t("archiveTitle")}
        description={t("archiveBody")}
        confirmLabel={isArchived ? tCommon("unarchive") : tCommon("archive")}
        withReason
        isPending={statusMutation.isPending}
        onConfirm={handleArchiveToggle}
      />
    </>
  );
}
