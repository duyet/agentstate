import type { ConversationResponse, ProjectDetailResponse } from "@agentstate/shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;

export type ProjectLoadError = "not-found" | "failed" | null;

interface UseProjectDataResult {
  project: ProjectDetail | null;
  loading: boolean;
  error: ProjectLoadError;
  conversations: Conversation[];
  convsLoading: boolean;
  setProject: (p: ProjectDetail | null) => void;
  setConversations: (c: Conversation[]) => void;
  refreshProject: () => Promise<void>;
  retry: () => void;
}

export function useProjectData(slug: string | null): UseProjectDataResult {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProjectLoadError>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  const refreshProject = async () => {
    if (!slug) return;
    const p = await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`);
    setProject(p);
  };

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api<ProjectDetail>(`/v1/projects/by-slug/${slug}`)
      .then((p) => {
        setProject(p);
        setConvsLoading(true);
        return api<{ data: Conversation[] }>(`/v1/projects/${p.id}/conversations?limit=100`);
      })
      .then((res) => setConversations(res.data))
      .catch((e) => {
        setError(e instanceof ApiError && e.status === 404 ? "not-found" : "failed");
        toast.error(e instanceof Error ? e.message : "Failed to load data");
      })
      .finally(() => {
        setLoading(false);
        setConvsLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    project,
    loading,
    error,
    conversations,
    convsLoading,
    setProject,
    setConversations,
    refreshProject,
    retry: load,
  };
}
