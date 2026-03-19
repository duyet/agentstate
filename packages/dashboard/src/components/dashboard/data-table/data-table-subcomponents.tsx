import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Column } from "./data-table-types";

interface EmptyConfig {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

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

interface StateTableWrapperProps<T> {
  columns: Column<T>[];
  className?: string;
  ariaLabel: string;
  ariaBusy?: boolean;
  children: React.ReactNode;
}

/** Shared wrapper for error/loading/empty states */
export function StateTableWrapper<T>({
  columns,
  className,
  ariaLabel,
  ariaBusy,
  children,
}: StateTableWrapperProps<T>) {
  return (
    <section
      className={cn("rounded-md border", className)}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
    >
      <Table>
        <TableHeader>
          <TableHeaderRow columns={columns} />
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </section>
  );
}

interface ErrorEmptyRowProps<T> {
  columns: Column<T>[];
  config: EmptyConfig;
  error?: boolean;
}

/** Single row for error or empty state */
export function ErrorEmptyRow<T>({ columns, config, error }: ErrorEmptyRowProps<T>) {
  return (
    <TableRow>
      <TableCell colSpan={columns.length}>
        <EmptyStateContent
          icon={config.icon}
          title={config.title}
          description={config.description}
          action={config.action}
          error={error}
        />
      </TableCell>
    </TableRow>
  );
}

interface DefaultRowProps<T> {
  row: T;
  index: number;
  columns: Column<T>[];
  rowKey?: (row: T, index: number) => string;
  rowClassName?: string | ((row: T, index: number) => string);
}

/** Default row renderer when custom renderRow not provided */
export function DefaultRow<T>({ row, index, columns, rowKey, rowClassName }: DefaultRowProps<T>) {
  const key = rowKey ? rowKey(row, index) : `${index}`;
  const rowCls = typeof rowClassName === "function" ? rowClassName(row, index) : rowClassName;

  return (
    <TableRow key={key} className={rowCls}>
      {columns.map((col) => (
        <TableCell key={col.key} className={col.className}>
          {col.render
            ? col.render(row, index)
            : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
        </TableCell>
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
