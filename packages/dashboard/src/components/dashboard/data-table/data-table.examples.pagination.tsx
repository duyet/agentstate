/**
 * EXAMPLE 5: Pagination (offset-based)
 * EXAMPLE 6: Load More (cursor-based)
 */

import React from "react";
import { DataTable, DataTableLoadMore, DataTablePagination } from "../data-table";
import { type Project, projectColumns } from "./data-table.examples.mock";

export function PaginationExample() {
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const total = 25;

  const projects: Project[] = Array.from({ length: pageSize }, (_, i) => ({
    id: String(i + 1),
    name: `Project ${i + 1}`,
    apiKeyCount: Math.floor(Math.random() * 5),
    createdAt: "2024-01-15",
  }));

  const columns = projectColumns;

  return (
    <>
      <DataTable data={projects} columns={columns} />
      <DataTablePagination
        hasPrev={page > 1}
        hasNext={page * pageSize < total}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
      />
    </>
  );
}

export function LoadMoreExample() {
  const [projects, setProjects] = React.useState<Project[]>([
    { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
  ]);
  const [nextCursor, setNextCursor] = React.useState<string | null>("abc123");
  const [loading, setLoading] = React.useState(false);

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    setTimeout(() => {
      setProjects((prev) => [
        ...prev,
        { id: "2", name: "Staging", apiKeyCount: 1, createdAt: "2024-02-20" },
      ]);
      setNextCursor(null);
      setLoading(false);
    }, 1000);
  };

  const columns = projectColumns;

  return (
    <>
      <DataTable data={projects} columns={columns} />
      <DataTableLoadMore hasNext={!!nextCursor} onLoadMore={handleLoadMore} loading={loading} />
    </>
  );
}
