import { PageHeaderSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";

export function _ProjectLoadingState() {
  return (
    <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <div className="flex flex-col gap-component">
        <div className="h-10 w-48 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />
        <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />
      </div>
    </div>
  );
}
