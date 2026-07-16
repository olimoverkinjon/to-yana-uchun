import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors EventCard's exact geometry — same aspect ratio, same padding, same
 * line heights. A skeleton whose shape differs from the content it stands in
 * for makes the page jump when the data lands, which is worse than no
 * skeleton at all.
 */
export function EventCardSkeleton() {
  return (
    <Card className="glass-panel gap-0 overflow-hidden border-0 p-0 ring-0">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3.5 w-2/5" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="border-border/60 flex items-center justify-between border-t pt-2.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function EventListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}
