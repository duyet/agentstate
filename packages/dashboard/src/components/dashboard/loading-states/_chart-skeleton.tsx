function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
}

interface ChartCardSkeletonProps {
  height?: string;
}

export function ChartCardSkeleton({ height = "h-64" }: ChartCardSkeletonProps) {
  return <SkBlock className={`${height} rounded-lg`} />;
}
