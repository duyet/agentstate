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
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">API Keys</TableHead>
            <TableHead className="hidden sm:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="cursor-pointer hover:bg-muted/50"
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
              <TableCell className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <FolderIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                    <p className="font-mono text-[11.5px] text-muted-foreground">{project.slug}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <KeyIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {project.key_count ?? 0}
                </div>
              </TableCell>
              <TableCell
                suppressHydrationWarning
                className="hidden text-[13px] text-muted-foreground sm:table-cell"
              >
                {new Date(project.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
