import { PageHeaderSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";

export function _ProjectLoadingState() {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <div className="flex flex-col gap-3">
        <div className="h-10 w-48 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />
        <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />
      </div>
    </div>
  );
}
