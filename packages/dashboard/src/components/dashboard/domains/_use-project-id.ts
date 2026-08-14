import { useProjectScope } from "@/components/project-scope";

/** Active project id from the shared scope. `ProjectResponse` uses `id`, not `project_id`. */
export function useProjectId(): string | null {
  const { selectedProject } = useProjectScope();
  return selectedProject?.id ?? null;
}
