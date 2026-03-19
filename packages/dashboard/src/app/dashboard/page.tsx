import { DashboardContent } from "./_dashboard-content";
import { DashboardHeader } from "./_dashboard-header";
import { useCreateProject } from "./_use-create-project";
import { useProjectsData } from "./_use-projects-data";

/**
 * ProjectsPage - Main dashboard page for managing API projects.
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
export default function ProjectsPage() {
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
    <div>
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
