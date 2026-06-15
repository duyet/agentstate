import type { ProjectResponse } from "@agentstate/shared";
import { Label, LayerCard, Select } from "@cloudflare/kumo";
import { ChatCircleIcon } from "@phosphor-icons/react";
import { EmptyState } from "@/components/dashboard/empty-state";

export interface _ProjectSelectorProps {
  projects: ProjectResponse[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
}

export function _ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
}: _ProjectSelectorProps) {
  if (projects.length <= 1) return null;

  const projectItems = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor="project-select" className="shrink-0">
        Project
      </Label>
      <Select
        aria-label="Select project"
        size="sm"
        className="w-[200px] font-mono text-xs"
        value={selectedProjectId}
        onValueChange={(v) => onSelectProject(v ?? "")}
        items={projectItems}
      />
    </div>
  );
}

export interface _EmptyProjectsProps {
  onCreateProject: () => void;
}

export function _EmptyProjects({ onCreateProject }: _EmptyProjectsProps) {
  return (
    <LayerCard>
      <EmptyState
        icon={<ChatCircleIcon aria-hidden="true" />}
        title="No projects yet"
        description="Create a project first, then conversations will appear here."
        action={{
          label: "Create your first project",
          onClick: onCreateProject,
        }}
      />
    </LayerCard>
  );
}
