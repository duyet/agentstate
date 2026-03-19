import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Column } from "../data-table-types";
import { TableHeaderRow } from "./table-header-row";

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
