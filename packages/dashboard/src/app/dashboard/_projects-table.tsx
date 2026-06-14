"use client";

import type { ProjectListItem } from "@agentstate/shared";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Table } from "@cloudflare/kumo/components/table";
import { Folder, Key } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

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
    <LayerCard className="overflow-hidden p-0">
      <Table>
        <Table.Header>
          <Table.Row className="bg-muted hover:bg-muted">
            <Table.Head>Name</Table.Head>
            <Table.Head className="hidden sm:table-cell">API Keys</Table.Head>
            <Table.Head className="hidden sm:table-cell">Created</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {projects.map((project) => (
            <Table.Row
              key={project.id}
              className="cursor-pointer hover:bg-muted"
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
              <Table.Cell className="py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <Folder className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                    <p className="font-mono text-[11.5px] text-muted-foreground">{project.slug}</p>
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell className="hidden sm:table-cell">
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Key className="size-3.5 text-muted-foreground" aria-hidden />
                  {project.key_count ?? 0}
                </div>
              </Table.Cell>
              <Table.Cell
                suppressHydrationWarning
                className="hidden text-[13px] text-muted-foreground sm:table-cell"
              >
                {new Date(project.created_at).toLocaleDateString()}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </LayerCard>
  );
}
