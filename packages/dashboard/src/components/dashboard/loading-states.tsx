import { TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map(() => (
        <TableRow key={Math.random()} className="animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={Math.random()}>
              <div
                className="h-3.5 bg-muted/60 rounded"
                style={{ width: j === 0 ? "10rem" : `${(4 + j * 2).toString()}rem` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface CardListSkeletonProps {
  count?: number;
}

export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map(() => (
        <div
          key={Math.random()}
          className="flex items-center gap-4 p-4 border border-border rounded-lg animate-pulse"
        >
          <div className="size-10 bg-muted/60 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/60 rounded w-32" />
            <div className="h-3 bg-muted/60 rounded w-24" />
          </div>
          <div className="h-8 bg-muted/60 rounded w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

interface StatsCardsSkeletonProps {
  count?: number;
}

export function StatsCardsSkeleton({ count = 4 }: StatsCardsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map(() => (
        <div
          key={Math.random()}
          className="p-6 border border-border rounded-lg bg-card animate-pulse space-y-3"
        >
          <div className="h-4 bg-muted/60 rounded w-20" />
          <div className="h-8 bg-muted/60 rounded w-24" />
          <div className="h-3 bg-muted/60 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

interface FormSkeletonProps {
  fields?: number;
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map(() => (
        <div key={Math.random()} className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted/60 rounded w-24" />
          <div className="h-10 bg-muted/60 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

interface PageHeaderSkeletonProps {
  hasAction?: boolean;
}

export function PageHeaderSkeleton({ hasAction = false }: PageHeaderSkeletonProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-muted/60 rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted/60 rounded animate-pulse" />
      </div>
      {hasAction && <div className="h-8 w-24 bg-muted/60 rounded animate-pulse" />}
    </div>
  );
}

interface ChartCardSkeletonProps {
  height?: string;
}

export function ChartCardSkeleton({ height = "h-64" }: ChartCardSkeletonProps) {
  return <div className={`${height} bg-muted/60 rounded-lg animate-pulse`} />;
}

interface MessageListSkeletonProps {
  lines?: number;
}

export function MessageListSkeleton({ lines = 3 }: MessageListSkeletonProps) {
  const widths = ["60%", "70%", "80%", "90%", "100%"];
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={Math.random()}
          className="h-3 bg-muted rounded animate-pulse"
          style={{ width: widths[i] ?? "60%" }}
        />
      ))}
    </div>
  );
}

interface ConversationRowSkeletonProps {
  rows?: number;
}

export function ConversationRowSkeleton({ rows = 3 }: ConversationRowSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map(() => (
        <div key={Math.random()} className="h-14 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
