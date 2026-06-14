import { Fragment } from "react";

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

interface CardListSkeletonProps {
  count?: number;
}

export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
  return (
    <div className="flex flex-col gap-3">
      {repeat2(count, () => (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}
