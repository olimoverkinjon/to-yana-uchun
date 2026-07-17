"use client";

import { CalendarHeart, Check, Link2, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityList, useLogActivity, useRecordActivityQuery } from "@/features/activity";
import { usePermissions } from "@/features/auth";
import { GiftList } from "@/features/gifts/components/gift-list";
import { useTelegramBackButton } from "@/features/telegram";
import { ErrorState } from "@/shared/components/ui/error-state";
import { formatEventDate } from "@/shared/lib/format";

import { useEventQuery } from "../hooks/use-events";
import type { EventSummaryRow } from "../types";

import { EventActionsMenu } from "./event-actions-menu";
import { EventDetailsSkeleton } from "./event-details-skeleton";
import { EventFormSheet } from "./event-form-sheet";
import { EventStats } from "./event-stats";
import { EventStatusBadge } from "./event-status-badge";

interface EventDetailsProps {
  eventId: string;
  /** Server-rendered row, so the first paint has content instead of a skeleton. */
  initialEvent?: EventSummaryRow | null;
}

export function EventDetails({ eventId, initialEvent }: EventDetailsProps) {
  const t = useTranslations("events");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);

  const query = useEventQuery(eventId);
  // The server-rendered row carries the first paint; the client query takes
  // over once it resolves and thereafter stays current via realtime.
  const event = query.data ?? initialEvent ?? null;

  // Telegram's own back button, rather than a second one drawn in the page —
  // inside the app, this is the control people already reach for.
  useTelegramBackButton(true, () => router.push("/events"));

  // One view per visit to this event, not one per re-render.
  const logActivity = useLogActivity();
  const loggedView = useRef<string | null>(null);

  useEffect(() => {
    if (loggedView.current === eventId) return;
    loggedView.current = eventId;
    logActivity("event_view", { event_id: eventId });
  }, [eventId, logActivity]);

  const activity = useRecordActivityQuery("events", eventId, { enabled: isSuperAdmin });

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  if (!event && query.isLoading) {
    return <EventDetailsSkeleton />;
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-foreground text-lg font-medium">{tErrors("eventNotFoundTitle")}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{tErrors("eventNotFoundBody")}</p>
        <Button variant="outline" onClick={() => router.push("/events")}>
          {tErrors("backToEvents")}
        </Button>
      </div>
    );
  }

  const isDeleted = Boolean(event.deleted_at);
  const couple =
    event.bride_name && event.groom_name
      ? t("couple", { bride: event.bride_name, groom: event.groom_name })
      : (event.bride_name ?? event.groom_name ?? null);

  return (
    <div className="space-y-5">
      <Card className="glass-panel gap-0 overflow-hidden border-0 p-0 ring-0">
        {event.cover_image ? (
          <div className="bg-muted relative aspect-[21/9] w-full">
            <Image
              src={event.cover_image}
              alt=""
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-foreground text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                  {event.title}
                </h1>
                <EventStatusBadge status={event.status ?? "draft"} isDeleted={isDeleted} />
              </div>
              {couple ? <p className="text-muted-foreground text-sm">{couple}</p> : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <ShareButton eventId={eventId} />
              <EventActionsMenu
                event={event}
                onEdit={() => setIsEditing(true)}
                onDeleted={() => router.push("/events")}
              />
            </div>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <CalendarHeart className="size-4" />
              {formatEventDate(event.event_date, event.event_year ?? 0, locale)}
            </span>
            {event.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </span>
            ) : null}
          </div>

          {event.description ? (
            <p className="text-muted-foreground border-border/60 border-t pt-3 text-sm whitespace-pre-line">
              {event.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="gifts">
        <TabsList className="w-full">
          <TabsTrigger value="gifts" className="flex-1">
            {t("details.gifts")}
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex-1">
            {t("details.overview")}
          </TabsTrigger>
          {/* Audit history is Super-Admin-only by RLS; hiding the tab avoids
              offering a view that would come back empty. */}
          {isSuperAdmin ? (
            <TabsTrigger value="activity" className="flex-1">
              {t("details.activity")}
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="gifts" className="pt-4">
          {/* A deleted event is inert: its gifts stay readable for a Super
              Admin, but nothing can be added or edited until it is restored —
              which is what the RLS policies enforce too. */}
          <GiftList eventId={eventId} canManage={!isDeleted} />
        </TabsContent>

        <TabsContent value="overview" className="pt-4">
          <EventStats eventId={eventId} giftCount={event.gift_count ?? 0} />
        </TabsContent>

        {isSuperAdmin ? (
          <TabsContent value="activity" className="pt-4">
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h2 className="text-foreground text-sm font-medium">{t("details.auditHistory")}</h2>
                <p className="text-muted-foreground text-xs">{t("details.adminOnly")}</p>
              </div>
              <ActivityList
                items={activity.data ?? []}
                isLoading={activity.isLoading}
                emptyTitle={t("details.auditEmpty")}
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <EventFormSheet open={isEditing} onOpenChange={setIsEditing} event={event} />
    </div>
  );
}

/**
 * Copies the event's URL. Every event has its own address inside the Mini App,
 * so a family member can be sent straight to one wedding.
 */
function ShareButton({ eventId }: { eventId: string }) {
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(tCommon("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied outright in some webviews; the toast
      // would claim a copy that did not happen.
      toast.error(url);
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label={tCommon("copy")}>
      {copied ? <Check className="text-chart-3" /> : <Link2 />}
    </Button>
  );
}
