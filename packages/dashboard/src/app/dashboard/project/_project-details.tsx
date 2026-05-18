import type { ProjectDetailResponse } from "@agentstate/shared";

interface ProjectDetailsProps {
  project: ProjectDetailResponse;
}

export function _ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">Project details</h3>
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <p>
          ID: <code className="font-mono text-foreground/70">{project.id}</code>
        </p>
        <p>Created: {new Date(project.created_at).toLocaleString()}</p>
        <p>
          Base URL: <code className="font-mono text-foreground/70">https://agentstate.app/api</code>
        </p>
      </div>
    </div>
  );
}
