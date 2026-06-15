import type { ProjectListItem } from "@agentstate/shared";
import { Folder } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

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
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-edge">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-edge-soft bg-panel">
            <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4 font-medium">
              Name
            </th>
            <th className="hidden px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4 font-medium sm:table-cell">
              Keys
            </th>
            <th className="hidden px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4 font-medium sm:table-cell">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge-soft">
          {projects.map((project) => (
            <tr
              key={project.id}
              className="cursor-pointer transition-colors hover:bg-panel2"
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
              <td className="py-3.5 pl-4 pr-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
                    <Folder className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13.5px] font-medium text-fg">
                      {project.name}
                    </span>
                    <span className="num font-mono text-[11.5px] text-fg-4">{project.slug}</span>
                  </div>
                </div>
              </td>
              <td className="hidden py-3.5 pr-4 text-right sm:table-cell">
                <Badge tone="default">{project.key_count ?? 0}</Badge>
              </td>
              <td
                suppressHydrationWarning
                className="num hidden py-3.5 pr-4 text-right font-mono text-[12.5px] text-fg-3 sm:table-cell"
              >
                {new Date(project.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
