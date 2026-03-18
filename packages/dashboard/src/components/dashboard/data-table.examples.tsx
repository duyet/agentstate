/**
 * DataTable Component Examples
 */

import { ArrowRightIcon, PlusIcon } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type Column,
  DataTable,
  DataTableHeader,
  DataTableLoadMore,
  DataTablePagination,
} from "./data-table";

// Shared types
interface Project {
  id: string;
  name: string;
  apiKeyCount: number;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  lastUsed: string | null;
  isActive: boolean;
}

// EXAMPLE 1: Basic Table with Header
export function BasicTableExample() {
  const projects: Project[] = [
    { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
    { id: "2", name: "Staging", apiKeyCount: 1, createdAt: "2024-02-20" },
  ];

  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created", className: "hidden md:table-cell" },
  ];

  return (
    <>
      <DataTableHeader
        title="Projects"
        description="Manage your AgentState projects"
        actions={<Button onClick={() => console.log("create")}>New Project</Button>}
      />
      <DataTable data={projects} columns={columns} />
    </>
  );
}

// EXAMPLE 2: Custom Cell Renderer (Badges, conditional rendering)
export function CustomCellRendererExample() {
  const apiKeys: ApiKey[] = [
    {
      id: "1",
      name: "Production Key",
      keyPreview: "as_live_•••••••••••••••••••••••••••",
      lastUsed: "2 hours ago",
      isActive: true,
    },
    {
      id: "2",
      name: "Test Key",
      keyPreview: "as_live_•••••••••••••••••••••••••••",
      lastUsed: null,
      isActive: false,
    },
  ];

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

// EXAMPLE 3: Loading & Empty States
export function LoadingStateExample() {
  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created" },
  ];

  return <DataTable data={[]} columns={columns} loading loadingRows={8} />;
}

export function EmptyStateExample() {
  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <DataTable
      data={[]}
      columns={columns}
      empty={{
        icon: <PlusIcon className="h-5 w-5" />,
        title: "No projects yet",
        description: "Create your first project to start tracking conversations",
        action: { label: "Create Project", onClick: () => console.log("create project") },
      }}
    />
  );
}

// EXAMPLE 4: Custom Row Renderer (interactive rows with click handlers)
export function CustomRowRendererExample() {
  const projects: Project[] = [
    { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
  ];
  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <DataTable
      data={projects}
      columns={columns}
      renderRow={(project) => (
        <tr
          key={project.id}
          className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
          onClick={() => console.log("navigate to", project.id)}
        >
          <td className="p-4 align-middle">{project.name}</td>
          <td className="p-4 align-middle">{project.apiKeyCount}</td>
          <td className="p-4 align-middle hidden md:table-cell">{project.createdAt}</td>
          <td className="p-4 align-middle text-right">
            <ArrowRightIcon className="h-4 w-4 ml-auto text-muted-foreground" />
          </td>
        </tr>
      )}
    />
  );
}

// EXAMPLE 5: Pagination (offset-based)
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

  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created" },
  ];

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

// EXAMPLE 6: Load More (cursor-based)
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

  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <>
      <DataTable data={projects} columns={columns} />
      <DataTableLoadMore hasNext={!!nextCursor} onLoadMore={handleLoadMore} loading={loading} />
    </>
  );
}
