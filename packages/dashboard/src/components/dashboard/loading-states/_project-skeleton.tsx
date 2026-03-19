import { Fragment } from "react";

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
}

interface CardListSkeletonProps {
  count?: number;
}

export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
  return (
    <div className="space-y-3">
      {repeat2(count, () => (
        <div className="flex items-center gap-4 p-4 border border-border rounded-lg animate-pulse">
          <SkBlock className="size-10 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <SkBlock className="h-4 rounded w-32" />
            <SkBlock className="h-3 rounded w-24" />
          </div>
          <SkBlock className="h-8 rounded w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}
