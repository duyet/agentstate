import type { ProjectDetailResponse } from "@agentstate/shared";
import { DeleteConfirmation } from "./_delete-confirmation";
import { _ProjectDetails } from "./_project-details";
import { _QuickStartCode } from "./_quick-start-code";
import { _RetentionSettings } from "./_retention-settings";

interface ProjectSettingsProps {
  project: ProjectDetailResponse;
  deleteConfirmSlug: string;
  deleting: boolean;
  onDeleteConfirm: (slug: string) => void;
  onDelete: () => void;
  onProjectUpdated: (updated: ProjectDetailResponse) => void;
}

export function _ProjectSettings({
  project,
  deleteConfirmSlug,
  deleting,
  onDeleteConfirm,
  onDelete,
  onProjectUpdated,
}: ProjectSettingsProps) {
  return (
    <div className="space-y-6">
      <_QuickStartCode />
      <_ProjectDetails project={project} />
      <_RetentionSettings project={project} onUpdated={onProjectUpdated} />
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
