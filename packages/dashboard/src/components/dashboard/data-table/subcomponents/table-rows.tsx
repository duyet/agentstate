import { TableCell, TableRow } from "@/components/ui/table";
import type { Column } from "../data-table-types";

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
