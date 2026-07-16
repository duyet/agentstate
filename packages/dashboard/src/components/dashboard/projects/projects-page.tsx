import { Plus } from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { DashboardContent } from "./_dashboard-content";
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
    <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
      <PageHeader
        title="Projects"
        description="Manage your API projects and keys."
        actions={
          <Button variant="primary" size="sm" onClick={handleStartCreate}>
            <Plus size={15} aria-hidden="true" />
            New Project
          </Button>
        }
      />
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
