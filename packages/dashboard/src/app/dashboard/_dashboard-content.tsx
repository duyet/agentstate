import type { ProjectListItem } from "@agentstate/shared";
import { CardListSkeleton } from "@/components/dashboard/loading-states";
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
 *
 * @example
 * ```tsx
 * <DashboardContent
 *   projects={projects}
 *   loadingProjects={loading}
 *   showCreate={showCreate}
 *   name={name}
 *   slug={slug}
 *   slugStatus={slugStatus}
 *   onNameChange={setNewName}
 *   onSlugChange={setSlug}
 *   onCreate={handleCreate}
 *   onCancel={handleCancel}
 *   onCreateClick={handleStartCreate}
 * />
 * ```
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
      {loadingProjects && !showCreate && <CardListSkeleton count={3} />}

      {/* Project list */}
      {!loadingProjects && projects.length > 0 && <ProjectsTable projects={projects} />}

      {/* Empty state */}
      {!loadingProjects && projects.length === 0 && !showCreate && (
        <ProjectsEmptyState onCreateClick={onCreateClick} />
      )}
    </>
  );
}
