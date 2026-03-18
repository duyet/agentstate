/**
 * EXAMPLE 4: Custom Row Renderer (interactive rows with click handlers)
 */

import { ArrowRightIcon } from "lucide-react";
import { type Column, DataTable } from "../data-table";
import { mockProjects, type Project, projectColumns } from "./data-table.examples.mock";

export function CustomRowRendererExample() {
  const projects: Project[] = mockProjects.slice(0, 1);
  const columns: Column<Project>[] = projectColumns;

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
