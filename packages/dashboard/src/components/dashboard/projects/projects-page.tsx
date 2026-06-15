import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardContent } from "./_dashboard-content";
import { DashboardHeader } from "./_dashboard-header";
import { useCreateProject } from "./_use-create-project";
import { useProjectsData } from "./_use-projects-data";

/**
 * ProjectsContent - Main dashboard page body for managing API projects.
 *
 * Features:
 * - Display list of projects
 * - Create new projects with name and slug
 * - Real-time slug availability checking
 * - Empty state when no projects exist
 *
 * State management split into focused hooks:
 * - useProjectsData: Fetch and manage projects list
 * - useCreateProject: Handle project creation form and logic
 */
function ProjectsContent() {
  const { projects, loadingProjects } = useProjectsData();
  const {
    showCreate,
    name,
    slug,
    slugStatus,
    handleStartCreate,
    handleCreate,
    handleCancel,
    handleSlugChange,
    handleNameChange,
  } = useCreateProject(projects);

  return (
    <div className="px-4 lg:px-6">
      <DashboardHeader onCreateClick={handleStartCreate} />
      <DashboardContent
        projects={projects}
        loadingProjects={loadingProjects}
        showCreate={showCreate}
        name={name}
        slug={slug}
        slugStatus={slugStatus}
        onNameChange={handleNameChange}
        onSlugChange={handleSlugChange}
        onCreate={handleCreate}
        onCancel={handleCancel}
        onCreateClick={handleStartCreate}
      />
    </div>
  );
}

/**
 * ProjectsPage - client:only island for the /dashboard route.
 *
 * Wraps the page body in DashboardShell (Clerk Providers + auth gate +
 * sidebar/header chrome). Rendered as `client:only="react"` from
 * src/pages/dashboard/index.astro.
 */
export function ProjectsPage() {
  return (
    <DashboardShell>
      <ProjectsContent />
    </DashboardShell>
  );
}
