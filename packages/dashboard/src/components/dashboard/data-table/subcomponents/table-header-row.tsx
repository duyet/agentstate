"use client";

import { Table } from "@cloudflare/kumo";
import type { Column } from "../data-table-types";

export function TableHeaderRow<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <Table.Row className="bg-muted hover:bg-muted">
      {columns.map((col) => (
        <Table.Head key={col.key} className={col.className}>
          {col.label}
        </Table.Head>
      ))}
    </Table.Row>
  );
}
