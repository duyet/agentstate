import type {
  ConversationResponse,
  MessageResponse,
  ProjectDetailResponse,
} from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;
type Message = MessageResponse;

interface UseProjectDataResult {
  project: ProjectDetail | null;
  loading: boolean;
  conversations: Conversation[];
  convsLoading: boolean;
  setProject: (p: ProjectDetail | null) => void;
  setConversations: (c: Conversation[]) => void;
  refreshProject: () => Promise<void>;
}

export function _useProjectData(slug: string | null): UseProjectDataResult {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  const refreshProject = async () => {
    if (!slug) return;
    const p = await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`);
    setProject(p);
  };

  useEffect(() => {
    if (!slug) return;
    api<ProjectDetail>(`/v1/projects/by-slug/${slug}`)
      .then((p) => {
        setProject(p);
        setConvsLoading(true);
        return api<{ data: Conversation[] }>(`/v1/projects/${p.id}/conversations?limit=100`);
      })
      .then((res) => setConversations(res.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => {
        setLoading(false);
        setConvsLoading(false);
      });
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
