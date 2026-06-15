import type { ProjectListItem } from "@agentstate/shared";
import { CreateProjectForm } from "./_create-project-form";
import { ProjectsEmptyState } from "./_projects-empty-state";
import { ProjectsTable } from "./_projects-table";

interface DashboardContentProps {
  projects: ProjectListItem[];
  loadingProjects: boolean;
  showCreate: boolean;
  name: string;
  slug: string;
  slugStatus: "idle" | "checking" | "available" | "taken";
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  onCreate: () => void;
  onCancel: () => void;
  onCreateClick: () => void;
}

/**
 * DashboardContent - Main content area for the projects dashboard.
 *
 * Orchestrates the display of:
 * - Create project form (when shown)
 * - Loading skeleton (when loading)
 * - Projects table (when projects exist)
 * - Empty state (when no projects)
 */
export function DashboardContent({
  projects,
  loadingProjects,
  showCreate,
  name,
  slug,
  slugStatus,
  onNameChange,
  onSlugChange,
  onCreate,
  onCancel,
  onCreateClick,
}: DashboardContentProps) {
  return (
    <>
      {/* Create form */}
      {showCreate && (
        <CreateProjectForm
          name={name}
          slug={slug}
          slugStatus={slugStatus}
          onNameChange={onNameChange}
          onSlugChange={onSlugChange}
          onCreate={onCreate}
          onCancel={onCancel}
        />
      )}

      {/* Loading state */}
      {loadingProjects && !showCreate && <ProjectsLoadingSkeleton />}

      {/* Project list */}
      {!loadingProjects && projects.length > 0 && <ProjectsTable projects={projects} />}

      {/* Empty state */}
      {!loadingProjects && projects.length === 0 && !showCreate && (
        <ProjectsEmptyState onCreateClick={onCreateClick} />
      )}
    </>
  );
}

/** Lightweight skeleton matching the projects table rows (plain Tailwind + tokens). */
function ProjectsLoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-edge">
      <div className="border-b border-edge-soft bg-panel px-4 py-2.5">
        <div className="h-3.5 w-40 animate-pulse rounded bg-panel2" />
      </div>
      <div className="divide-y divide-edge-soft">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton rows, index is stable here
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="size-8 shrink-0 animate-pulse rounded-[var(--radius)] bg-panel2" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3.5 w-32 animate-pulse rounded bg-panel2" />
              <div className="h-3 w-24 animate-pulse rounded bg-panel2" />
            </div>
            <div className="h-3 w-10 animate-pulse rounded bg-panel2" />
          </div>
        ))}
      </div>
    </div>
  );
}
