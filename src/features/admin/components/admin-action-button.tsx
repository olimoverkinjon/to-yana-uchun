"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { toAppError, type ActionResult } from "@/shared/lib/errors";

interface AdminActionButtonProps {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  action: (reason?: string) => Promise<ActionResult<unknown>>;
  success: string;
  undo?: () => Promise<ActionResult<unknown>>;
  undoLabel?: string;
}

export function AdminActionButton({
  label,
  title,
  description,
  confirmLabel,
  variant = "default",
  action,
  success,
  undo,
  undoLabel = "Undo",
}: AdminActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (reason?: string) => {
    startTransition(async () => {
      const result = await action(reason);
      if (!result.ok) {
        toast.error(toAppError(result.error).code);
        return;
      }
      setOpen(false);
      toast.success(success, {
        duration: 10_000,
        action: undo
          ? {
              label: undoLabel,
              onClick: async () => {
                const undone = await undo();
                if (!undone.ok) toast.error(toAppError(undone.error).code);
              },
            }
          : undefined,
      });
    });
  };

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel ?? label}
        variant={variant}
        withReason
        isPending={pending}
        onConfirm={run}
      />
    </>
  );
}
