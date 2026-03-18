import type { ProjectResponse } from "@agentstate/shared";
import { MessageSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex items-center gap-2">
      <label htmlFor="project-select" className="text-xs text-muted-foreground shrink-0">
        Project
      </label>
      <Select value={selectedProjectId} onValueChange={(v) => onSelectProject(v ?? "")}>
        <SelectTrigger id="project-select" size="sm" className="w-[180px]">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface _EmptyProjectsProps {
  onCreateProject: () => void;
}

export function _EmptyProjects({ onCreateProject }: _EmptyProjectsProps) {
  return (
    <EmptyState
      icon={<MessageSquareIcon className="h-6 w-6 text-muted-foreground" />}
      title="No projects yet"
      description="Create a project first, then conversations will appear here."
      action={{
        label: "Create your first project",
        onClick: onCreateProject,
      }}
    />
  );
}
