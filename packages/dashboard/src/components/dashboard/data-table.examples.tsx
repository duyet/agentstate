/**
 * DataTable Component Examples
 *
 * This file contains usage examples for the DataTable component and its sub-components.
 * These are not meant to be imported or used directly in production code.
 */

import { ArrowRightIcon, KeyIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type Column,
  DataTable,
  DataTableHeader,
  DataTableLoadMore,
  DataTablePagination,
} from "./data-table";

/* ==============================================================================
   EXAMPLE 1: Basic Table with Simple Columns
   ============================================================================== */

interface Project {
  id: string;
  name: string;
  apiKeyCount: number;
  createdAt: string;
}

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

/* ==============================================================================
   EXAMPLE 2: Table with Custom Cell Renderer
   ============================================================================== */

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  lastUsed: string | null;
  isActive: boolean;
}

export function CustomRendererExample() {
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

/* ==============================================================================
   EXAMPLE 3: Table with Loading State
   ============================================================================== */

export function LoadingStateExample() {
  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
    { key: "createdAt", label: "Created" },
  ];

  return <DataTable data={[]} columns={columns} loading loadingRows={8} />;
}

/* ==============================================================================
   EXAMPLE 4: Table with Empty State
   ============================================================================== */

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
        action: {
          label: "Create Project",
          onClick: () => console.log("create project"),
        },
      }}
    />
  );
}

/* ==============================================================================
   EXAMPLE 5: Table with Action Buttons in Cells
   ============================================================================== */

export function ActionsExample() {
  const apiKeys: ApiKey[] = [
    {
      id: "1",
      name: "Production Key",
      keyPreview: "as_live_•••••••••••••••••••••••••••",
      lastUsed: "2 hours ago",
      isActive: true,
    },
  ];

  const columns: Column<ApiKey>[] = [
    { key: "name", label: "Name" },
    { key: "keyPreview", label: "Key", className: "hidden lg:table-cell" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => console.log("edit", row.id)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => console.log("delete", row.id)}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return <DataTable data={apiKeys} columns={columns} />;
}

/* ==============================================================================
   EXAMPLE 6: Table with Custom Row Renderer (Interactive Rows)
   ============================================================================== */

export function CustomRowExample() {
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
          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
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

/* ==============================================================================
   EXAMPLE 7: Table with Pagination (Offset-based)
   ============================================================================== */

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

/* ==============================================================================
   EXAMPLE 8: Table with Load More (Cursor-based)
   ============================================================================== */

export function LoadMoreExample() {
  const [projects, setProjects] = React.useState<Project[]>([
    { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
  ]);
  const [nextCursor, setNextCursor] = React.useState<string | null>("abc123");
  const [loading, setLoading] = React.useState(false);

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    // Simulate API call
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

/* ==============================================================================
   EXAMPLE 9: Table with Row Key Function
   ============================================================================== */

export function RowKeyExample() {
  const projects: Project[] = [
    { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
  ];

  const columns: Column<Project>[] = [
    { key: "name", label: "Name" },
    { key: "apiKeyCount", label: "API Keys" },
  ];

  return (
    <DataTable
      data={projects}
      columns={columns}
      rowKey={(project) => project.id}
      rowClassName={(project) => (project.apiKeyCount > 2 ? "bg-muted/30" : "")}
    />
  );
}

/* ==============================================================================
   EXAMPLE 10: Complete Example with Header, Table, and Pagination
   ============================================================================== */

export function CompleteExample() {
  const [page, setPage] = React.useState(1);
  const [loading, _setLoading] = React.useState(false);

  const projects: Project[] = [
    { id: "1", name: "Production", apiKeyCount: 3, createdAt: "2024-01-15" },
    { id: "2", name: "Staging", apiKeyCount: 1, createdAt: "2024-02-20" },
  ];

  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "apiKeyCount", label: "API Keys", className: "text-center" },
    { key: "createdAt", label: "Created", className: "hidden md:table-cell" },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button size="sm" variant="ghost" onClick={() => console.log("view", row.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableHeader
        title="Projects"
        description="Manage your AgentState projects and API keys"
        actions={
          <Button size="sm" onClick={() => console.log("create")}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </Button>
        }
      />
      <DataTable data={projects} columns={columns} loading={loading} />
      <DataTablePagination
        hasPrev={page > 1}
        hasNext={false}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
      />
    </div>
  );
}

// Import React for the examples
import React from "react";
