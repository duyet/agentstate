import type { ProjectListItem } from "@agentstate/shared";
import { Folder } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgo } from "@/lib/format";

type Project = ProjectListItem;

interface ProjectsTableProps {
  projects: Project[];
}

const TOTAL_COLUMNS = 7;

/**
 * ProjectsTable - Projects list with per-project stats and a name/slug filter.
 *
 * Columns: name + slug, conversations, messages, tokens, keys, last activity,
 * created. Secondary columns hide progressively on smaller viewports. Rows are
 * clickable (and keyboard-navigable) and open the project detail page.
 */
export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const open = (slug: string) => router.push(`/dashboard/project/?slug=${slug}`);

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter projects by name or slug…"
        aria-label="Filter projects"
        className="sm:max-w-xs"
      />

      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead align="right" className="hidden sm:table-cell">
              Conversations
            </TableHead>
            <TableHead align="right" className="hidden lg:table-cell">
              Messages
            </TableHead>
            <TableHead align="right" className="hidden sm:table-cell">
              Tokens
            </TableHead>
            <TableHead align="right" className="hidden lg:table-cell">
              Keys
            </TableHead>
            <TableHead align="right" className="hidden md:table-cell">
              Last activity
            </TableHead>
            <TableHead align="right" className="hidden xl:table-cell">
              Created
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={TOTAL_COLUMNS} className="text-center text-fg-4">
                No projects match “{query}”.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((project) => (
              <TableRow
                key={project.id}
                clickable
                onClick={() => open(project.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    open(project.slug);
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
                      <span className="truncate text-[13.5px] font-medium text-fg">
                        {project.name}
                      </span>
                      <span className="as-mono-sm text-fg-4">{project.slug}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell align="right" mono className="hidden sm:table-cell">
                  {project.conversation_count.toLocaleString()}
                </TableCell>
                <TableCell align="right" mono className="hidden lg:table-cell">
                  {project.message_count.toLocaleString()}
                </TableCell>
                <TableCell align="right" mono className="hidden sm:table-cell">
                  {project.total_tokens.toLocaleString()}
                </TableCell>
                <TableCell align="right" className="hidden lg:table-cell">
                  <Badge tone="default">{project.key_count ?? 0}</Badge>
                </TableCell>
                <TableCell align="right" mono className="hidden md:table-cell text-fg-3">
                  {project.last_activity_at ? timeAgo(project.last_activity_at) : "—"}
                </TableCell>
                <TableCell align="right" mono className="hidden xl:table-cell text-fg-3">
                  {new Date(project.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
