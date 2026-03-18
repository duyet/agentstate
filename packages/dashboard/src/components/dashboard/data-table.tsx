import { Loader2 } from "lucide-react";
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

// Internal sub-components
function TableHeaderRow<T>({ columns }: { columns: Column<T>[] }) {
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

function SkeletonRow<T>({ columns }: { columns: Column<T>[] }) {
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

function EmptyStateContent({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
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

/** Column definition for DataTable */
export interface Column<T> {
  key: string;
  label: React.ReactNode;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

/** Props for the main DataTable component */
export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  loadingRows?: number;
  empty?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  rowKey?: (row: T, index: number) => string;
  rowClassName?: string | ((row: T, index: number) => string);
  renderRow?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * DataTable - Type-safe, reusable data table component.
 *
 * Features: loading skeleton, empty state, responsive columns, custom renderers.
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   loading={isLoading}
 *   rowKey={(row) => row.id}
 * />
 * ```
 */
export function DataTable<T>({
  data,
  columns,
  loading = false,
  loadingRows = 5,
  empty,
  rowKey,
  rowClassName,
  renderRow,
  className,
}: DataTableProps<T>) {
  const defaultEmpty = {
    title: "No data",
    description: "There are no items to display",
  };

  const emptyConfig = { ...defaultEmpty, ...empty };

  // Loading state
  if (loading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableHeaderRow columns={columns} />
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are static
              <SkeletonRow key={`skeleton-${i}`} columns={columns} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableHeaderRow columns={columns} />
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyStateContent
                  icon={emptyConfig.icon}
                  title={emptyConfig.title}
                  description={emptyConfig.description}
                  action={emptyConfig.action}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // Data table
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableHeaderRow columns={columns} />
        </TableHeader>
        <TableBody>
          {renderRow
            ? data.map((row, i) => renderRow(row, i))
            : data.map((row, i) => {
                const key = rowKey ? rowKey(row, i) : `${i}`;
                const rowCls =
                  typeof rowClassName === "function" ? rowClassName(row, i) : rowClassName;

                return (
                  <TableRow key={key} className={rowCls}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render(row, i)
                          : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Props for DataTableHeader component */
export interface DataTableHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Consistent header for data table pages */
export function DataTableHeader({ title, description, actions }: DataTableHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Props for DataTablePagination component */
export interface DataTablePaginationProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

/** Previous/Next pagination controls for offset-based pagination */
export function DataTablePagination({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  className,
}: DataTablePaginationProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-4", className)}>
      <Button size="sm" variant="outline" onClick={onPrev} disabled={!hasPrev}>
        Previous
      </Button>
      <Button size="sm" variant="outline" onClick={onNext} disabled={!hasNext}>
        Next
      </Button>
    </div>
  );
}

/** Props for DataTableLoadMore component */
export interface DataTableLoadMoreProps {
  hasNext: boolean;
  onLoadMore: () => void;
  loading?: boolean;
  className?: string;
}

/** Cursor-based "Load more" button for infinite scroll pagination */
export function DataTableLoadMore({
  hasNext,
  onLoadMore,
  loading = false,
  className,
}: DataTableLoadMoreProps) {
  if (!hasNext) return null;

  return (
    <div className={cn("flex justify-center mt-4", className)}>
      <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}
