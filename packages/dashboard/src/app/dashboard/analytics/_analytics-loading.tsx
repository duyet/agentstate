"use client";

import { Loader2 } from "lucide-react";
import { AreaChartCard } from "@/components/analytics/area-chart";
import { ChartCardSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";

interface AnalyticsLoadingProps {
  hasData: boolean;
}

export function AnalyticsLoading({ hasData }: AnalyticsLoadingProps) {
  if (hasData) {
    return (
      <output className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>Refreshing...</span>
      </output>
    );
  }

  return (
    <div className="space-y-4 mt-6">
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
