import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
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
    <div className="flex flex-col gap-6 px-5 py-7 sm:px-7">
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
 * Wraps the page body in the new design-system shell (Clerk Providers +
 * AppShell auth gate + sidebar/header). Rendered as `client:only="react"`
 * from src/pages/dashboard/index.astro. Plain Tailwind + tokens, no Kumo.
 */
export function ProjectsPage() {
  return (
    <Providers>
      <AppShell>
        <ProjectsContent />
      </AppShell>
    </Providers>
  );
}
