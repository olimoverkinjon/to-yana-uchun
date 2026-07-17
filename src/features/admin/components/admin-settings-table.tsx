"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateSettingAction } from "@/features/admin/api/admin-actions";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { toAppError } from "@/shared/lib/errors";
import { Settings } from "lucide-react";

import type { AdminList, SettingRow } from "../types";
import { AdminTable, type AdminColumn } from "./admin-table";

export function AdminSettingsTable({
  settings,
  query,
}: {
  settings: AdminList<SettingRow>;
  query: Record<string, string | number | undefined>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const columns: AdminColumn<SettingRow>[] = [
    { id: "key", label: "Key", render: (setting) => <span className="font-medium">{setting.key}</span> },
    {
      id: "value",
      label: "Value",
      render: (setting) => (
        <Textarea
          className="min-h-16 min-w-72 font-mono text-xs"
          value={drafts[setting.id] ?? JSON.stringify(setting.value, null, 2)}
          onChange={(event) => setDrafts((draft) => ({ ...draft, [setting.id]: event.target.value }))}
        />
      ),
    },
    { id: "description", label: "Description", render: (setting) => setting.description ?? "-" },
    { id: "updated", label: "Updated", render: (setting) => new Date(setting.updated_at).toLocaleString() },
    {
      id: "actions",
      label: "",
      render: (setting) => (
        <Button
          size="sm"
          onClick={async () => {
            try {
              const value = JSON.parse(drafts[setting.id] ?? JSON.stringify(setting.value));
              const result = await updateSettingAction({ key: setting.key, value, description: setting.description });
              if (!result.ok) toast.error(toAppError(result.error).code);
              else toast.success("Setting saved");
            } catch {
              toast.error("Invalid JSON");
            }
          }}
        >
          Save
        </Button>
      ),
    },
  ];

  return (
    <AdminTable
      rows={settings.items}
      columns={columns}
      totalCount={settings.totalCount}
      page={settings.page}
      pageSize={settings.pageSize}
      basePath="/admin/settings"
      query={query}
      empty={
        <EmptyState
          icon={Settings}
          title="No settings found"
          body="System configuration rows will appear here once they exist."
        />
      }
    />
  );
}
