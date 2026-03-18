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
                style={{ width: j === 0 ? "10rem" : `${4 + j * 2}rem` }}
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
