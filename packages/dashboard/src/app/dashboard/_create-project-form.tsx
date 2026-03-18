import { CheckIcon, LoaderIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Give your project a name. The slug is used in API paths.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="project-name"
              className="text-xs font-medium text-foreground mb-1.5 block"
            >
              Project name
            </label>
            <Input
              id="project-name"
              placeholder="My Chatbot"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
              className="text-sm h-9"
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="project-slug"
              className="text-xs font-medium text-foreground mb-1.5 block"
            >
              Project slug
            </label>
            <div className="relative">
              <Input
                id="project-slug"
                placeholder="my-chatbot"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                className={`text-sm h-9 font-mono pr-8 ${
                  slugStatus === "taken" ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
                aria-describedby="slug-status"
              />
              {slug && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">
                  {slugStatus === "checking" && (
                    <LoaderIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  )}
                  {slugStatus === "available" && (
                    <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                  )}
                  {slugStatus === "taken" && <XIcon className="h-3.5 w-3.5 text-red-500" />}
                </div>
              )}
            </div>
            <div id="slug-status" className="min-h-[20px]">
              {slugStatus === "taken" && (
                <p className="text-xs text-red-500 mt-1.5" role="alert">
                  This slug is already taken. Choose a different one.
                </p>
              )}
              {slugStatus === "available" && slug && (
                <p className="text-xs text-muted-foreground mt-1.5">Available</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2 justify-end">
        <Button size="sm" variant="ghost" className="text-xs h-8 px-4" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="text-xs h-8 px-4"
          onClick={onCreate}
          disabled={!name.trim() || !slug || slugStatus === "taken" || slugStatus === "checking"}
        >
          Create project
        </Button>
      </CardFooter>
    </Card>
  );
}
