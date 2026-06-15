import { Folder } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProjectsEmptyStateProps {
  onCreateClick: () => void;
}

/**
 * ProjectsEmptyState - Empty state when the user has no projects.
 *
 * Centered icon + copy + CTA inside a Card (plain Tailwind + tokens, no Kumo).
 */
export function ProjectsEmptyState({ onCreateClick }: ProjectsEmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-edge bg-panel2 text-fg-3">
        <Folder className="size-5" aria-hidden="true" />
      </span>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="text-[14px] font-medium text-fg">No projects yet</p>
        <p className="text-[12.5px] leading-5 text-fg-3">
          Projects group your conversations and API keys.
        </p>
      </div>
      <Button variant="secondary" onClick={onCreateClick} className="min-h-[36px] py-2">
        Create your first project
      </Button>
    </Card>
  );
}
