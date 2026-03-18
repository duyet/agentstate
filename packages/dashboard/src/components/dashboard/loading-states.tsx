import { Fragment } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

// Skeleton block component with pulse animation
function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
}

function repeat(count: number, render: (i: number) => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render(i)}</Fragment>);
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      {repeat2(rows, () => (
        <TableRow className="animate-pulse">
          {repeat(columns, (j) => (
            <TableCell key={j}>
              <SkBlock
                className="h-3.5 rounded"
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

interface StatsCardsSkeletonProps {
  count?: number;
}

export function StatsCardsSkeleton({ count = 4 }: StatsCardsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {repeat2(count, () => (
        <div className="p-6 border border-border rounded-lg bg-card animate-pulse space-y-3">
          <SkBlock className="h-4 rounded w-20" />
          <SkBlock className="h-8 rounded w-24" />
          <SkBlock className="h-3 rounded w-full" />
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
      {repeat2(fields, () => (
        <div className="space-y-2 animate-pulse">
          <SkBlock className="h-4 rounded w-24" />
          <SkBlock className="h-10 rounded w-full" />
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
      <div className="space-y-2 animate-pulse">
        <SkBlock className="h-6 w-48 rounded" />
        <SkBlock className="h-4 w-64 rounded" />
      </div>
      {hasAction && <SkBlock className="h-8 w-24 rounded" />}
    </div>
  );
}

interface ChartCardSkeletonProps {
  height?: string;
}

export function ChartCardSkeleton({ height = "h-64" }: ChartCardSkeletonProps) {
  return <SkBlock className={`${height} rounded-lg`} />;
}

interface MessageListSkeletonProps {
  lines?: number;
}

const MSG_WIDTHS = ["60%", "70%", "80%", "90%", "100%"] as const;

export function MessageListSkeleton({ lines = 3 }: MessageListSkeletonProps) {
  return (
    <div className="space-y-2 py-1">
      {repeat(lines, (i) => (
        <SkBlock className="h-3 rounded" style={{ width: MSG_WIDTHS[i] ?? "60%" }} />
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
      {repeat2(rows, () => (
        <SkBlock className="h-14 rounded-lg" />
      ))}
    </div>
  );
}
