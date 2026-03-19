import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Helper components
export { DataTableHeader } from "./data-table/data-table-header";
export { DataTableLoadMore } from "./data-table/data-table-load-more";
export { DataTablePagination } from "./data-table/data-table-pagination";
// Sub-components
export {
  EmptyStateContent,
  SkeletonRow,
  TableHeaderRow,
} from "./data-table/data-table-subcomponents";
// Types
export type {
  Column,
  DataTableHeaderProps,
  DataTableLoadMoreProps,
  DataTablePaginationProps,
  DataTableProps,
} from "./data-table/data-table-types";

// Internal imports
import {
  EmptyStateContent,
  SkeletonRow,
  TableHeaderRow,
} from "./data-table/data-table-subcomponents";
import type { DataTableProps } from "./data-table/data-table-types";

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
  error,
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
  const errorConfig = error ? { ...defaultEmpty, ...error } : null;

  // Error state (highest priority)
  if (errorConfig) {
    return (
      <div
        className={cn("rounded-md border", className)}
        role="region"
        aria-label="Data table error"
      >
        <Table>
          <TableHeader>
            <TableHeaderRow columns={columns} />
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyStateContent
                  icon={errorConfig.icon}
                  title={errorConfig.title}
                  description={errorConfig.description}
                  action={errorConfig.action}
                  error
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        className={cn("rounded-md border", className)}
        role="region"
        aria-label="Loading data"
        aria-busy="true"
      >
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
      <div
        className={cn("rounded-md border", className)}
        role="region"
        aria-label="Empty data table"
      >
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
    <div className={cn("rounded-md border", className)} role="region" aria-label="Data table">
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
