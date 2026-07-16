import type { Metadata } from "next";

import { EventList } from "@/features/events/components/event-list";

export const metadata: Metadata = {
  title: "Events — Wedding Registry",
};

export default function EventsPage() {
  return <EventList />;
}
