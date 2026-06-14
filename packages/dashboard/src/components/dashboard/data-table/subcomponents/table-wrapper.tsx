"use client";

import { Table } from "@cloudflare/kumo";
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
      className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
    >
      <Table>
        <Table.Header>
          <TableHeaderRow columns={columns} />
        </Table.Header>
        <Table.Body>{children}</Table.Body>
      </Table>
    </section>
  );
}
