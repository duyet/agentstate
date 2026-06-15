import { PageHeaderSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";

export function _ProjectLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <div className="flex flex-col gap-3">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
