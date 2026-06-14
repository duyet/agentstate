import type { ProjectResponse } from "@agentstate/shared";
import { MessageSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
    <div className="flex items-center gap-2.5">
      <Label htmlFor="project-select" className="as-label shrink-0">
        Project
      </Label>
      <Select value={selectedProjectId} onValueChange={(v) => onSelectProject(v ?? "")}>
        <SelectTrigger id="project-select" size="sm" className="w-[200px] font-mono text-xs">
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
    <Card className="border-dashed">
      <EmptyState
        icon={<MessageSquareIcon aria-hidden="true" />}
        title="No projects yet"
        description="Create a project first, then conversations will appear here."
        action={{
          label: "Create your first project",
          onClick: onCreateProject,
        }}
      />
    </Card>
  );
}
