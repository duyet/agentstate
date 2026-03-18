/**
 * EXAMPLE 3: Loading & Empty States
 */

import { PlusIcon } from "lucide-react";
import { type Column, DataTable } from "../data-table";
import { type Project, projectColumns } from "./data-table.examples.mock";

export function LoadingStateExample() {
  const columns: Column<Project>[] = projectColumns;

  return <DataTable data={[]} columns={columns} loading loadingRows={8} />;
}

export function EmptyStateExample() {
  const columns: Column<Project>[] = projectColumns;

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
