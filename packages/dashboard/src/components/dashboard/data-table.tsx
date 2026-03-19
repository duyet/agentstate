import { TableBody } from "@/components/ui/table";
// Table, TableHeader imported in subcomponents
// cn imported in subcomponents

import { mergeEmptyConfig } from "./data-table/data-table-helpers";
import {
  DefaultRow,
  ErrorEmptyRow,
  SkeletonRow,
  StateTableWrapper,
} from "./data-table/data-table-subcomponents";
import type { DataTableProps } from "./data-table/data-table-types";

// Re-exports
export { DataTableHeader } from "./data-table/data-table-header";
export { DataTableLoadMore } from "./data-table/data-table-load-more";
export { DataTablePagination } from "./data-table/data-table-pagination";
export {
  DefaultRow,
  EmptyStateContent,
  ErrorEmptyRow,
  SkeletonRow,
  StateTableWrapper,
} from "./data-table/data-table-subcomponents";
export type {
  Column,
  DataTableHeaderProps,
  DataTableLoadMoreProps,
  DataTablePaginationProps,
  DataTableProps,
} from "./data-table/data-table-types";

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
  const emptyConfig = mergeEmptyConfig(empty);
  const errorConfig = error ? mergeEmptyConfig(error) : null;

  // Error state (highest priority)
  if (errorConfig) {
    return (
      <StateTableWrapper columns={columns} className={className} ariaLabel="Data table error">
        <ErrorEmptyRow columns={columns} config={errorConfig} error />
      </StateTableWrapper>
    );
  }

  // Loading state
  if (loading) {
    return (
      <StateTableWrapper columns={columns} className={className} ariaLabel="Loading data" ariaBusy>
        {Array.from({ length: loadingRows }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are static
          <SkeletonRow key={`skeleton-${i}`} columns={columns} />
        ))}
      </StateTableWrapper>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <StateTableWrapper columns={columns} className={className} ariaLabel="Empty data table">
        <ErrorEmptyRow columns={columns} config={emptyConfig} />
      </StateTableWrapper>
    );
  }

  // Data table
  return (
    <StateTableWrapper columns={columns} className={className} ariaLabel="Data table">
      <TableBody>
        {renderRow
          ? data.map((row, i) => renderRow(row, i))
          : data.map((row, i) => (
              <DefaultRow
                key={rowKey ? rowKey(row, i) : `${i}`}
                row={row}
                index={i}
                columns={columns}
                rowKey={rowKey}
                rowClassName={rowClassName}
              />
            ))}
      </TableBody>
    </StateTableWrapper>
  );
}
