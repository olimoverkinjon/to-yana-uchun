"use client";

import { Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardFilters } from "@/features/analytics/types";
import { usePermissions } from "@/features/auth";

const FORMATS = [
  { id: "csv", icon: Table2 },
  { id: "xlsx", icon: FileSpreadsheet },
  { id: "pdf", icon: FileText },
] as const;

const REPORTS = ["yearly", "contributor", "cash", "gift_type"] as const;

interface ExportMenuProps {
  filters: DashboardFilters;
  /** Present on an event page: enables the event report and scopes the rest. */
  eventId?: string;
}

/**
 * Export, for a Super Admin.
 *
 * Rendered only for them — but the gate that matters is on /api/reports, which
 * re-checks the role before it builds anything. Hiding this button stops a
 * Viewer being invited to do something that would fail; it is not what stops
 * them doing it.
 *
 * The current dashboard filters travel with the request, so the file matches
 * what is on screen. An export that silently ignored the filters would be a
 * different document than the one the user thinks they are downloading.
 */
export function ExportMenu({ filters, eventId }: ExportMenuProps) {
  const t = useTranslations("reports");
  const tErrors = useTranslations("errors");
  const { isSuperAdmin } = usePermissions();
  const [pending, setPending] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  const download = async (type: string, format: string) => {
    const key = `${type}-${format}`;
    setPending(key);

    try {
      const params = new URLSearchParams({ type, format });
      const scoped = { ...filters, ...(eventId ? { eventId } : {}) };

      for (const [name, value] of Object.entries(scoped)) {
        if (value !== null && value !== undefined && value !== "") params.set(name, String(value));
      }

      const response = await fetch(`/api/reports?${params}`);

      if (!response.ok) {
        // 403 here means the role changed since the page loaded — the server
        // is the authority, so report what it said rather than what the UI
        // believed when it rendered this button.
        const code = response.status === 403 ? "forbidden" : response.status === 401 ? "unauthenticated" : "unknown";
        toast.error(tErrors(code));
        return;
      }

      const blob = await response.blob();
      const filename = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `report.${format}`;

      // Anchor + object URL: the browser handles saving, and it works inside
      // Telegram's webview where window.open is frequently blocked.
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(t("downloaded"));
    } catch {
      toast.error(tErrors("network"));
    } finally {
      setPending(null);
    }
  };

  const types = eventId ? (["event", ...REPORTS] as const) : REPORTS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={pending !== null}>
            <Download className="mr-1.5" />
            {t("export")}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {types.map((type, index) => (
          <DropdownMenuGroup key={type}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-muted-foreground text-[11px]">
              {t(`titles.${type === "gift_type" ? "giftType" : type}` as never)}
            </DropdownMenuLabel>
            {FORMATS.map(({ id, icon: Icon }) => (
              <DropdownMenuItem key={id} disabled={pending !== null} onClick={() => void download(type, id)}>
                <Icon className="mr-2 size-3.5" />
                {t(`formats.${id}`)}
                {pending === `${type}-${id}` ? <span className="text-muted-foreground ml-auto text-xs">…</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
