"use client";

import { motion } from "framer-motion";
import { CalendarHeart, Gift, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEventDate, formatRelativeTime } from "@/shared/lib/format";

import type { EventSummaryRow } from "../types";

import { EventStatusBadge } from "./event-status-badge";

interface EventCardProps {
  event: EventSummaryRow;
  index?: number;
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  const t = useTranslations("events");
  const locale = useLocale();

  const isDeleted = Boolean(event.deleted_at);
  const couple =
    event.bride_name && event.groom_name
      ? t("couple", { bride: event.bride_name, groom: event.groom_name })
      : (event.bride_name ?? event.groom_name ?? null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      // Capped so the 12th card on a page is not visibly late; the stagger is
      // there to give the list a sense of arrival, not to be counted.
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        className={cn(
          "glass-panel group gap-0 overflow-hidden border-0 p-0 ring-0 transition-shadow duration-300",
          "hover:shadow-[0_2px_4px_var(--tw-shadow-color),0_16px_40px_-16px_var(--tw-shadow-color)]",
          isDeleted && "opacity-60",
        )}
      >
        <Link href={`/events/${event.id}`} className="focus-visible:ring-ring block outline-none focus-visible:ring-2">
          <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
            {event.cover_image ? (
              <Image
                src={event.cover_image}
                alt=""
                fill
                // Two columns from `sm` up, capped by the shell's max width —
                // so the browser never downloads a full-width image for a
                // half-width slot.
                sizes="(min-width: 1024px) 512px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="from-primary/12 via-primary/5 to-accent/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                <CalendarHeart className="text-primary/35 size-9" strokeWidth={1.5} />
              </div>
            )}

            <div className="absolute top-2.5 right-2.5">
              <EventStatusBadge status={event.status ?? "draft"} isDeleted={isDeleted} />
            </div>
          </div>

          <div className="space-y-2.5 p-4">
            <div className="space-y-1">
              <h3 className="text-foreground line-clamp-1 text-base font-semibold tracking-tight text-balance">
                {event.title}
              </h3>
              {couple ? <p className="text-muted-foreground line-clamp-1 text-sm">{couple}</p> : null}
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <CalendarHeart className="size-3.5" />
                {formatEventDate(event.event_date, event.event_year ?? 0, locale)}
              </span>
              {event.location ? (
                <span className="inline-flex max-w-[12rem] items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              ) : null}
            </div>

            <div className="border-border/60 flex items-center justify-between border-t pt-2.5">
              <span className="text-foreground inline-flex items-center gap-1.5 text-xs font-medium tabular-nums">
                <Gift className="text-primary size-3.5" />
                {t("giftCount", { count: event.gift_count ?? 0 })}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("updated", { time: formatRelativeTime(event.updated_at, locale) })}
              </span>
            </div>
          </div>
        </Link>
      </Card>
    </motion.div>
  );
}
