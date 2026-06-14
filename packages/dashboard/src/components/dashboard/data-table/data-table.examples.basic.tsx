/**
 * EXAMPLE 1: Basic Table with Header
 */

import { Button } from "@/components/ui/button";
import { type Column, DataTable, DataTableHeader } from "../data-table";
import { mockProjects, type Project, projectColumnsWithHidden } from "./data-table.examples.mock";

export function BasicTableExample() {
  const projects: Project[] = mockProjects;

  const columns: Column<Project>[] = projectColumnsWithHidden;

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
