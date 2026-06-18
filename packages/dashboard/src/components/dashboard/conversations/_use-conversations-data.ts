import type { ConversationResponse, ProjectResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProjectScope } from "@/components/project-scope";
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
  appendConversations: (newConversations: Conversation[]) => void;
  setHasMore: (value: boolean) => void;
}

export type UseConversationsDataResult = UseConversationsDataState & UseConversationsDataActions;

export function useConversationsData(): UseConversationsDataResult {
  // The active project comes from the sidebar-driven global scope.
  const { projects, selectedProjectId, loadingProjects } = useProjectScope();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Fetch conversations when the active project changes
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
    appendConversations,
    setHasMore,
  };
}
