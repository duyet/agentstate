"use client";

import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Folder } from "@phosphor-icons/react";
import { EmptyState } from "@/components/dashboard/empty-state";

interface ProjectsEmptyStateProps {
  onCreateClick: () => void;
}

/**
 * ProjectsEmptyState - Empty state when user has no projects.
 *
 * Uses EmptyState component wrapped in a dashed LayerCard for visual consistency.
 *
 * @example
 * ```tsx
 * <ProjectsEmptyState onCreateClick={handleCreate} />
 * ```
 */
export function ProjectsEmptyState({ onCreateClick }: ProjectsEmptyStateProps) {
  return (
    <LayerCard>
      <EmptyState
        icon={<Folder aria-hidden />}
        title="No projects yet"
        description="Projects group your conversations and API keys."
        action={{
          label: "Create your first project",
          onClick: onCreateClick,
        }}
      />
    </LayerCard>
  );
}
