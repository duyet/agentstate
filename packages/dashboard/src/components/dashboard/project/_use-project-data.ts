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

  // The `active` flag (same pattern as _use-traces-data.ts) keeps a slower
  // stale response from a previous slug overwriting the current project's
  // data on rapid navigation, and avoids setState after unmount (#318).
  const load = useCallback(() => {
    if (!slug) return () => {};
    setLoading(true);
    setError(null);
    let active = true;
    api<ProjectDetail>(`/v1/projects/by-slug/${slug}`)
      .then((p) => {
        if (!active) return null;
        setProject(p);
        setConvsLoading(true);
        return api<{ data: Conversation[] }>(`/v1/projects/${p.id}/conversations?limit=100`);
      })
      .then((res) => {
        if (!active || !res) return;
        setConversations(res.data);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof ApiError && e.status === 404 ? "not-found" : "failed");
        toast.error(e instanceof Error ? e.message : "Failed to load data");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setConvsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => load(), [load]);

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
