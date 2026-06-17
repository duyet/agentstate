import type { ProjectListItem } from "@agentstate/shared";
import { Folder } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
 * ProjectsTable - Plain table displaying the list of projects with click navigation.
 *
 * Features:
 * - Clickable rows with keyboard navigation (Enter)
 * - Project name and slug (mono)
 * - API key count (mono, tabular-nums)
 * - Created date (mono, tabular-nums)
 */
export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter();

  return (
    <Table responsive>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead align="right" className="hidden sm:table-cell">
            Keys
          </TableHead>
          <TableHead align="right" className="hidden sm:table-cell">
            Created
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow
            key={project.id}
            clickable
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
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
                  <Folder className="size-4" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13.5px] font-medium text-fg">{project.name}</span>
                  <span className="as-mono-sm text-fg-4">{project.slug}</span>
                </div>
              </div>
            </TableCell>
            <TableCell align="right" className="hidden sm:table-cell">
              <Badge tone="default">{project.key_count ?? 0}</Badge>
            </TableCell>
            <TableCell align="right" mono className="hidden sm:table-cell">
              {new Date(project.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
