import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderSkeletonProps {
  hasAction?: boolean;
}

export function PageHeaderSkeleton({ hasAction = false }: PageHeaderSkeletonProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {hasAction && <Skeleton className="h-8 w-24" />}
    </div>
  );
}
