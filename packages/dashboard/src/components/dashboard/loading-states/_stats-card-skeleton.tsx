import { Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsSkeletonProps {
  count?: number;
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

export function StatsCardsSkeleton({ count = 4 }: StatsCardsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {repeat2(count, () => (
        <div className="flex flex-col gap-3 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
