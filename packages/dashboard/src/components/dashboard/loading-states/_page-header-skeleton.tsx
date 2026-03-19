import { Fragment } from "react";

function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
}

interface PageHeaderSkeletonProps {
  hasAction?: boolean;
}

export function PageHeaderSkeleton({ hasAction = false }: PageHeaderSkeletonProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div className="space-y-2 animate-pulse">
        <SkBlock className="h-6 w-48 rounded" />
        <SkBlock className="h-4 w-64 rounded" />
      </div>
      {hasAction && <SkBlock className="h-8 w-24 rounded" />}
    </div>
  );
}
