"use client";

import { Loader } from "@cloudflare/kumo";
import { ChartCardSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";

interface AnalyticsLoadingProps {
  hasData: boolean;
}

export function AnalyticsLoading({ hasData }: AnalyticsLoadingProps) {
  if (hasData) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader size="sm" aria-hidden="true" />
        <span>Refreshing...</span>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <StatsCardsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-64" />
        <ChartCardSkeleton height="h-64" />
      </div>
      <ChartCardSkeleton height="h-64" />
      <ChartCardSkeleton height="h-48" />
    </div>
  );
}
