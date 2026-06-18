import { ChatCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface _EmptyProjectsProps {
  onCreateProject: () => void;
}

export function _EmptyProjects({ onCreateProject }: _EmptyProjectsProps) {
  return (
    <Card className="flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
          <ChatCircle className="size-6" aria-hidden />
        </div>
        <div className="flex max-w-xs flex-col gap-1">
          <p className="text-[14px] font-medium text-fg">No projects yet</p>
          <p className="text-[12.5px] leading-5 text-fg-4">
            Create a project first, then conversations will appear here.
          </p>
        </div>
        <Button variant="secondary" onClick={onCreateProject}>
          Create your first project
        </Button>
      </div>
    </Card>
  );
}
