import type { ConversationResponse, ProjectDetailResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;

interface UseProjectDataResult {
  project: ProjectDetail | null;
  loading: boolean;
  conversations: Conversation[];
  convsLoading: boolean;
  setProject: (p: ProjectDetail | null) => void;
  setConversations: (c: Conversation[]) => void;
  refreshProject: () => Promise<void>;
}

export function useProjectData(slug: string | null): UseProjectDataResult {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
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
  useEffect(() => {
    if (!slug) return;
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

  return {
    project,
    loading,
    conversations,
    convsLoading,
    setProject,
    setConversations,
    refreshProject,
  };
}
