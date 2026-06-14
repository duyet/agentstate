"use client";

import type { ProjectDetailResponse } from "@agentstate/shared";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";

interface ProjectDetailsProps {
  project: ProjectDetailResponse;
}

export function _ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <LayerCard className="flex flex-col gap-4 p-6">
      <Text variant="heading3" as="h2">
        Project details
      </Text>
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
    </LayerCard>
  );
}
