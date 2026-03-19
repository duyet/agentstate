import { Fragment } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

function repeat(count: number, render: (i: number) => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render(i)}</Fragment>);
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
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
