import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { Column } from "./data-table-types";

export function TableHeaderRow<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <TableRow>
      {columns.map((col) => (
        <TableHead key={col.key} className={col.className}>
          {col.label}
        </TableHead>
      ))}
    </TableRow>
  );
}

export function SkeletonRow<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <TableRow className="animate-pulse" aria-hidden="true">
      {columns.map((col, j) => (
        <TableCell key={col.key} className={col.className}>
          <div
            className="h-3.5 bg-muted/60 rounded"
            style={{ width: j === 0 ? "10rem" : `${(4 + j * 2).toString()}rem` }}
            aria-hidden="true"
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

interface EmptyStateContentProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  error?: boolean;
}

export function EmptyStateContent({
  icon,
  title,
  description,
  action,
  error,
}: EmptyStateContentProps) {
  return (
    <output
      className="flex flex-col items-center justify-center py-16 text-center"
      aria-live="polite"
    >
      {icon && (
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 ${error ? "bg-destructive/10" : "bg-muted/60"}`}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>}
      {action && (
        <Button size="sm" variant="outline" className="h-8" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </output>
  );
}
