import { Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
