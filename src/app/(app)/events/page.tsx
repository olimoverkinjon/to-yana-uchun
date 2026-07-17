import type { Metadata } from "next";

import { EventList } from "@/features/events/components/event-list";

export const metadata: Metadata = {
  title: "To'ylar — To'y Daftari",
};

export default function EventsPage() {
  return <EventList />;
}
