/**
 * EXAMPLE 2: Custom Cell Renderer (Badges, conditional rendering)
 */

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "../data-table";
import { type ApiKey, mockApiKeys } from "./data-table.examples.mock";

export function CustomCellRendererExample() {
  const apiKeys: ApiKey[] = mockApiKeys;

  const columns: Column<ApiKey>[] = [
    { key: "name", label: "Name" },
    { key: "keyPreview", label: "Key", className: "hidden lg:table-cell" },
    {
      key: "lastUsed",
      label: "Last Used",
      className: "hidden md:table-cell",
      render: (row) =>
        row.lastUsed ? row.lastUsed : <span className="text-muted-foreground">Never</span>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (row) =>
        row.isActive ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
  ];

  return <DataTable data={apiKeys} columns={columns} />;
}
