import { Loader2 } from "lucide-react";
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
    <TableRow className="animate-pulse">
      {columns.map((col, j) => (
        <TableCell key={col.key} className={col.className}>
          <div
            className="h-3.5 bg-muted/60 rounded"
            style={{ width: j === 0 ? "10rem" : `${(4 + j * 2).toString()}rem` }}
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
}

export function EmptyStateContent({ icon, title, description, action }: EmptyStateContentProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>}
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
