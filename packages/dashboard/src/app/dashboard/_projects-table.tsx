"use client";

import type { ProjectListItem } from "@agentstate/shared";
import { FolderIcon, KeyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Project = ProjectListItem;

interface ProjectsTableProps {
  projects: Project[];
}

/**
 * ProjectsTable - Table displaying list of projects with click navigation.
 *
 * Features:
 * - Clickable rows with keyboard navigation
 * - Project name and slug display
 * - API key count
 * - Created date
 *
 * @example
 * ```tsx
 * <ProjectsTable projects={projects} />
 * ```
 */
export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">API Keys</TableHead>
            <TableHead className="hidden sm:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => router.push(`/dashboard/project/?slug=${project.slug}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  router.push(`/dashboard/project/?slug=${project.slug}`);
                }
              }}
              tabIndex={0}
              aria-label={`Open ${project.name}`}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <KeyIcon className="h-3 w-3" />
                  {project.key_count ?? 0}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
