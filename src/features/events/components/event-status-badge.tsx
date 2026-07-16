"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

import type { EventStatus } from "../schemas/event-schema";

interface EventStatusBadgeProps {
  status: string;
  /** Soft-deleted rows are only ever visible to a Super Admin. */
  isDeleted?: boolean;
}

/**
 * Encodes state in colour as well as words, so an archived or deleted wedding
 * is recognisable while scanning a list rather than only on close reading.
 */
export function EventStatusBadge({ status, isDeleted = false }: EventStatusBadgeProps) {
  const t = useTranslations("events.status");

  if (isDeleted) {
    return <Badge variant="destructive">{t("deleted")}</Badge>;
  }

  const variant: Record<EventStatus, "default" | "secondary" | "outline"> = {
    active: "default",
    draft: "outline",
    archived: "secondary",
  };

  const key = (status in variant ? status : "draft") as EventStatus;
  return <Badge variant={variant[key]}>{t(key)}</Badge>;
}
