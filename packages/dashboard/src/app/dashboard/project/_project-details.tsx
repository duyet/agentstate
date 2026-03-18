import type { ProjectDetailResponse } from "@agentstate/shared";

interface ProjectDetailsProps {
  project: ProjectDetailResponse;
}

export function _ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <div>
      <h3 className="font-medium mb-2">Project details</h3>
      <div className="text-sm text-muted-foreground space-y-1.5">
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
