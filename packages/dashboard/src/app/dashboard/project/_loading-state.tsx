import { PageHeaderSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";

export function _ProjectLoadingState() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <div className="space-y-3">
        <div className="h-10 bg-muted/60 rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted/60 rounded animate-pulse" />
      </div>
    </div>
  );
}
