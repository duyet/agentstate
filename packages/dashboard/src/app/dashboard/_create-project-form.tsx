import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CreateProjectFormActions } from "./_create-project-form-actions";
import { CreateProjectFormHeader } from "./_create-project-form-header";
import { ProjectNameInput } from "./_project-name-input";
import { ProjectSlugInput } from "./_project-slug-input";

interface CreateProjectFormProps {
  name: string;
  slug: string;
  slugStatus: "idle" | "checking" | "available" | "taken";
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

/**
 * CreateProjectForm - Form for creating a new project with name and slug.
 *
 * Features:
 * - Auto-generates slug from name
 * - Real-time slug availability checking
 * - Visual feedback for slug status (checking, available, taken)
 *
 * @example
 * ```tsx
 * <CreateProjectForm
 *   name={name}
 *   slug={slug}
 *   slugStatus={slugStatus}
 *   onNameChange={setNewName}
 *   onSlugChange={setSlug}
 *   onCreate={handleCreate}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function CreateProjectForm({
  name,
  slug,
  slugStatus,
  onNameChange,
  onSlugChange,
  onCreate,
  onCancel,
}: CreateProjectFormProps) {
  const isSubmitDisabled =
    !name.trim() || !slug || slugStatus === "taken" || slugStatus === "checking";

  return (
    <Card className="mb-6">
      <CreateProjectFormHeader />
      <CardContent>
        <div className="space-y-4">
          <ProjectNameInput value={name} onChange={onNameChange} onSubmit={onCreate} />
          <ProjectSlugInput value={slug} status={slugStatus} onChange={onSlugChange} />
        </div>
      </CardContent>
      <CardFooter className="gap-2 justify-end">
        <CreateProjectFormActions
          onCancel={onCancel}
          onCreate={onCreate}
          disabled={isSubmitDisabled}
        />
      </CardFooter>
    </Card>
  );
}
