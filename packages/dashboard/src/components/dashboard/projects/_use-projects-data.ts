import type { ProjectListItem } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

/**
 * useProjectsData - Hook for fetching and managing projects data.
 *
 * Features:
 * - Fetches projects on mount
 * - Loading state management
 * - Error handling with toast notifications
 *
 * @example
 * ```tsx
 * const { projects, loadingProjects } = useProjectsData();
 * ```
 */
export function useProjectsData() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    api<{ data: ProjectListItem[] }>("/v1/projects")
      .then((res) => setProjects(res.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load projects"))
      .finally(() => setLoadingProjects(false));
  }, []);

  return { projects, loadingProjects };
}
