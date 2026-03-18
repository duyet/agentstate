import type { ProjectDetailResponse } from "@agentstate/shared";
import { DeleteConfirmation } from "./_delete-confirmation";
import { _ProjectDetails } from "./_project-details";
import { _QuickStartCode } from "./_quick-start-code";

interface ProjectSettingsProps {
  project: ProjectDetailResponse;
  deleteConfirmSlug: string;
  deleting: boolean;
  onDeleteConfirm: (slug: string) => void;
  onDelete: () => void;
}

export function _ProjectSettings({
  project,
  deleteConfirmSlug,
  deleting,
  onDeleteConfirm,
  onDelete,
}: ProjectSettingsProps) {
  return (
    <div className="space-y-6">
      <_QuickStartCode />
      <_ProjectDetails project={project} />
      <DeleteConfirmation
        projectName={project.name}
        projectSlug={project.slug}
        confirmSlug={deleteConfirmSlug}
        deleting={deleting}
        onConfirmChange={onDeleteConfirm}
        onDelete={onDelete}
      />
    </div>
  );
}
