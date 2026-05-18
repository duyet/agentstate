"use client";

import type { ProjectListItem } from "@agentstate/shared";
import { FolderIcon, KeyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
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
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/35 hover:bg-muted/35">
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
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FolderIcon aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <KeyIcon aria-hidden="true" />
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
    </Card>
  );
}
