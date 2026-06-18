import type { ProjectListItem } from "@agentstate/shared";
import { CaretDown, CaretUp, Folder } from "@phosphor-icons/react";
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
import { cn } from "@/lib/utils";

type Project = ProjectListItem;

interface ProjectsTableProps {
  projects: Project[];
}

const TOTAL_COLUMNS = 7;

type SortKey =
  | "name"
  | "conversation_count"
  | "message_count"
  | "total_tokens"
  | "key_count"
  | "last_activity_at"
  | "created_at";

type SortDir = "asc" | "desc";

/** Comparable value for a project under the active sort key. */
function sortValue(p: Project, key: SortKey): number | string {
  switch (key) {
    case "name":
      return p.name.toLowerCase();
    case "created_at":
      return new Date(p.created_at).getTime();
    case "last_activity_at":
      return p.last_activity_at ?? 0;
    case "key_count":
      return p.key_count ?? 0;
    default:
      return p[key];
  }
}

/** Sortable column header — toggles direction when re-clicked. */
function SortHead({
  label,
  sortKey: key,
  activeKey,
  dir,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = activeKey === key;
  return (
    <TableHead
      align={align}
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(key)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-[0.12em] transition-colors hover:text-fg",
          active ? "text-fg-2" : "text-fg-4",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <CaretUp size={10} weight="bold" aria-hidden />
          ) : (
            <CaretDown size={10} weight="bold" aria-hidden />
          ))}
      </button>
    </TableHead>
  );
}

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
  const [sortKey, setSortKey] = useState<SortKey>("last_activity_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Names read best A→Z; counts and dates most-useful high→low first.
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * factor;
      }
      return ((av as number) - (bv as number)) * factor;
    });
  }, [filtered, sortKey, sortDir]);

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
            <SortHead
              label="Name"
              sortKey="name"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
            />
            <SortHead
              label="Conversations"
              sortKey="conversation_count"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              align="right"
              className="hidden sm:table-cell"
            />
            <SortHead
              label="Messages"
              sortKey="message_count"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              align="right"
              className="hidden lg:table-cell"
            />
            <SortHead
              label="Tokens"
              sortKey="total_tokens"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              align="right"
              className="hidden sm:table-cell"
            />
            <SortHead
              label="Keys"
              sortKey="key_count"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              align="right"
              className="hidden lg:table-cell"
            />
            <SortHead
              label="Last activity"
              sortKey="last_activity_at"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              align="right"
              className="hidden md:table-cell"
            />
            <SortHead
              label="Created"
              sortKey="created_at"
              activeKey={sortKey}
              dir={sortDir}
              onSort={toggleSort}
              align="right"
              className="hidden xl:table-cell"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={TOTAL_COLUMNS} className="text-center text-fg-4">
                No projects match “{query}”.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((project) => (
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
