import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardSkeletonProps {
  height?: string;
}

export function ChartCardSkeleton({ height = "h-64" }: ChartCardSkeletonProps) {
  return <Skeleton className={`${height} rounded-lg`} />;
}
