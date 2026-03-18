import type { ReactNode } from "react";

/** Column definition for DataTable */
export interface Column<T> {
  key: string;
  label: ReactNode;
  className?: string;
  render?: (row: T, index: number) => ReactNode;
}

/** Props for the main DataTable component */
export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  loadingRows?: number;
  empty?: {
    icon?: ReactNode;
    title?: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  rowKey?: (row: T, index: number) => string;
  rowClassName?: string | ((row: T, index: number) => string);
  renderRow?: (row: T, index: number) => ReactNode;
  className?: string;
}

/** Props for DataTableHeader component */
export interface DataTableHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Props for DataTablePagination component */
export interface DataTablePaginationProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

/** Props for DataTableLoadMore component */
export interface DataTableLoadMoreProps {
  hasNext: boolean;
  onLoadMore: () => void;
  loading?: boolean;
  className?: string;
}
