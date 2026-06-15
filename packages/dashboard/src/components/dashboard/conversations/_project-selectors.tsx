import type { ProjectResponse } from "@agentstate/shared";
import { ChatCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  return (
    <div className="flex items-center gap-2.5">
      <label
        htmlFor="project-select"
        className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-4"
      >
        Project
      </label>
      <select
        id="project-select"
        aria-label="Select project"
        value={selectedProjectId}
        onChange={(e) => onSelectProject(e.target.value)}
        className="h-[36px] w-[200px] rounded-[var(--radius)] border border-edge bg-panel px-3 font-mono text-[12px] text-fg transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface _EmptyProjectsProps {
  onCreateProject: () => void;
}

export function _EmptyProjects({ onCreateProject }: _EmptyProjectsProps) {
  return (
    <Card className="flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
          <ChatCircle className="size-6" aria-hidden />
        </div>
        <div className="flex max-w-xs flex-col gap-1">
          <p className="text-[14px] font-medium text-fg">No projects yet</p>
          <p className="text-[12.5px] leading-5 text-fg-4">
            Create a project first, then conversations will appear here.
          </p>
        </div>
        <Button variant="secondary" onClick={onCreateProject}>
          Create your first project
        </Button>
      </div>
    </Card>
  );
}
