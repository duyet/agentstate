import type { ConversationResponse, ProjectResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export type Conversation = ConversationResponse & { project_id: string };

interface UseConversationsDataState {
  projects: ProjectResponse[];
  selectedProjectId: string;
  conversations: Conversation[];
  loadingProjects: boolean;
  loadingConversations: boolean;
  hasMore: boolean;
}

interface UseConversationsDataActions {
  setSelectedProjectId: (id: string) => void;
  appendConversations: (newConversations: Conversation[]) => void;
  setHasMore: (value: boolean) => void;
}

export type UseConversationsDataResult = UseConversationsDataState & UseConversationsDataActions;

export function _useConversationsData(): UseConversationsDataResult {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    setLoadingProjects(true);
    api<{ data: ProjectResponse[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoadingProjects(false));
  }, []);

  // Fetch conversations when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingConversations(true);
    setConversations([]);
    setHasMore(true);
    api<{ data: Conversation[] }>(`/v1/projects/${selectedProjectId}/conversations?limit=50`)
      .then((res) => {
        setConversations(res.data);
        setHasMore(res.data.length >= 50);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoadingConversations(false));
  }, [selectedProjectId]);

  const appendConversations = (newConversations: Conversation[]) => {
    setConversations((prev) => [...prev, ...newConversations]);
  };

  return {
    projects,
    selectedProjectId,
    conversations,
    loadingProjects,
    loadingConversations,
    hasMore,
    setSelectedProjectId,
    appendConversations,
    setHasMore,
  };
}
