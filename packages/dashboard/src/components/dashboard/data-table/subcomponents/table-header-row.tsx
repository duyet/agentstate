import { TableHead, TableRow } from "@/components/ui/table";
import type { Column } from "../data-table-types";

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
