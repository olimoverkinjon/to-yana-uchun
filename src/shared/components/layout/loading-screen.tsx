import { Skeleton } from "@/components/ui/skeleton";

/** Generic route-level Suspense/loading.tsx fallback — a shape, not a spinner. */
export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6" aria-busy="true">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
