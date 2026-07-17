"use client";

import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { restoreVersionAction } from "@/features/audit/api/audit-actions";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { toAppError } from "@/shared/lib/errors";

export function RestoreVersionButton({ auditId, tableName }: { auditId: string; tableName: "events" | "gifts" }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="mr-1.5 size-3.5" />
        Restore version
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Restore this historical version?"
        description="The current record will be updated from this audit snapshot. The restore itself creates a new audit log."
        confirmLabel="Restore version"
        withReason
        isPending={pending}
        onConfirm={(reason) => {
          startTransition(async () => {
            const result = await restoreVersionAction({ auditId, tableName, reason });
            if (result.ok) {
              toast.success("Version restored");
              setOpen(false);
            } else {
              toast.error(toAppError(result.error).code);
            }
          });
        }}
      />
    </>
  );
}
