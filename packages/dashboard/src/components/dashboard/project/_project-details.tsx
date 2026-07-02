"use client";

import type { ProjectDetailResponse } from "@agentstate/shared";
import { Card } from "@/components/ui/card";

interface ProjectDetailsProps {
  project: ProjectDetailResponse;
}

export function _ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <Card className="flex flex-col gap-component card-padding">
      <h2 className="text-[15px] text-fg">Project details</h2>
      <div className="flex flex-col gap-tight text-[13px] text-fg-3">
        <p>
          ID: <code className="num font-mono text-fg-2">{project.id}</code>
        </p>
        <p suppressHydrationWarning>Created: {new Date(project.created_at).toLocaleString()}</p>
        <p>
          Base URL: <code className="num font-mono text-fg-2">https://agentstate.app/api</code>
        </p>
      </div>
    </Card>
  );
}
