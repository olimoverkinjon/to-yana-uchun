"use client";

import { Badge } from "@/components/ui/badge";
import { setAttachmentDeletedAction } from "@/features/admin/api/admin-actions";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Files } from "lucide-react";

import type { AdminList, AttachmentRow } from "../types";
import { AdminActionButton } from "./admin-action-button";
import { AdminTable, type AdminColumn } from "./admin-table";

export function AdminFilesTable({
  files,
  query,
}: {
  files: AdminList<AttachmentRow>;
  query: Record<string, string | number | undefined>;
}) {
  const columns: AdminColumn<AttachmentRow>[] = [
    { id: "name", label: "File", render: (file) => <span className="font-medium">{file.file_name}</span> },
    { id: "bucket", label: "Bucket", render: (file) => file.storage_bucket },
    { id: "type", label: "Type", render: (file) => file.mime_type ?? "-" },
    { id: "size", label: "Size", render: (file) => (file.file_size ? `${Math.round(file.file_size / 1024)} KB` : "-") },
    {
      id: "status",
      label: "Status",
      render: (file) => (
        <Badge variant={file.deleted_at ? "destructive" : "secondary"}>{file.deleted_at ? "Deleted" : "Active"}</Badge>
      ),
    },
    { id: "created", label: "Created", render: (file) => new Date(file.created_at).toLocaleString() },
    {
      id: "actions",
      label: "",
      render: (file) => (
        <AdminActionButton
          label={file.deleted_at ? "Restore" : "Delete"}
          title={file.deleted_at ? "Restore this file?" : "Delete this file?"}
          description="This changes the file record state. The storage object is preserved for auditability."
          variant={file.deleted_at ? "default" : "destructive"}
          action={(reason) => setAttachmentDeletedAction({ attachmentId: file.id, deleted: !file.deleted_at, reason })}
          success={file.deleted_at ? "File restored" : "File deleted"}
          undo={
            file.deleted_at
              ? () => setAttachmentDeletedAction({ attachmentId: file.id, deleted: true, reason: "Undo restore" })
              : () => setAttachmentDeletedAction({ attachmentId: file.id, deleted: false, reason: "Undo delete" })
          }
        />
      ),
    },
  ];

  return (
    <AdminTable
      rows={files.items}
      columns={columns}
      totalCount={files.totalCount}
      page={files.page}
      pageSize={files.pageSize}
      basePath="/admin/files"
      query={query}
      empty={
        <EmptyState
          icon={Files}
          title="No files found"
          body="Uploaded covers, avatars and attachments will appear here."
        />
      }
    />
  );
}
