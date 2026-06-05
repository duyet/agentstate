import { PageHeaderSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";
import { Skeleton } from "@/components/ui/skeleton";

export function _ProjectLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
