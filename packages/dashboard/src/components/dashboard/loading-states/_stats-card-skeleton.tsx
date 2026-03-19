import { Fragment } from "react";

interface StatsCardsSkeletonProps {
  count?: number;
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
}

export function StatsCardsSkeleton({ count = 4 }: StatsCardsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {repeat2(count, () => (
        <div className="p-6 border border-border rounded-lg bg-card animate-pulse space-y-3">
          <SkBlock className="h-4 rounded w-20" />
          <SkBlock className="h-8 rounded w-24" />
          <SkBlock className="h-3 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
