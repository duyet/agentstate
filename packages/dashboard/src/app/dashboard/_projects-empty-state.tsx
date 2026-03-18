import { FolderIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";

interface ProjectsEmptyStateProps {
  onCreateClick: () => void;
}

/**
 * ProjectsEmptyState - Empty state when user has no projects.
 *
 * Uses EmptyState component wrapped in a dashed Card for visual consistency.
 *
 * @example
 * ```tsx
 * <ProjectsEmptyState onCreateClick={handleCreate} />
 * ```
 */
export function ProjectsEmptyState({ onCreateClick }: ProjectsEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <EmptyState
        icon={<FolderIcon className="h-5 w-5 text-muted-foreground" />}
        title="No projects yet"
        description="Projects group your conversations and API keys."
        action={{
          label: "Create your first project",
          onClick: onCreateClick,
        }}
      />
    </Card>
  );
}
