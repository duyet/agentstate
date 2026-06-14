interface ChartCardSkeletonProps {
  height?: string;
}

export function ChartCardSkeleton({ height = "h-64" }: ChartCardSkeletonProps) {
  return <div className={`${height} animate-pulse rounded-lg bg-muted`} />;
}
