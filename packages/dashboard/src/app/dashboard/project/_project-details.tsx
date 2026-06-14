import type { ProjectDetailResponse } from "@agentstate/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectDetailsProps {
  project: ProjectDetailResponse;
}

export function _ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <p>
            ID: <code className="font-mono text-muted-foreground">{project.id}</code>
          </p>
          <p suppressHydrationWarning>Created: {new Date(project.created_at).toLocaleString()}</p>
          <p>
            Base URL:{" "}
            <code className="font-mono text-muted-foreground">https://agentstate.app/api</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
