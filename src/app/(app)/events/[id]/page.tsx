import type { Metadata } from "next";

import { getEvent } from "@/features/events/api/events-repository";
import { EventDetails } from "@/features/events/components/event-details";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Every wedding has its own address inside the Mini App, so one can be shared
 * directly rather than described ("open the app, scroll down, it's the third
 * one").
 */
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const event = await getEvent(createSupabaseServerClient(), id);
    // Falls back rather than 404-ing the title: RLS legitimately returns null
    // for a Viewer without access, and the page itself handles that state.
    if (!event) return { title: "Wedding Registry" };
    return { title: `${event.title} — Wedding Registry` };
  } catch {
    return { title: "Wedding Registry" };
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;

  // Fetched on the server so the first paint carries real content. The client
  // component re-queries and takes over from there, which is what keeps the
  // page live over realtime. A failure here is not fatal — the client will
  // fetch it again and render its own error state if that fails too.
  const initialEvent = await getEvent(createSupabaseServerClient(), id).catch(() => null);

  return <EventDetails eventId={id} initialEvent={initialEvent} />;
}
