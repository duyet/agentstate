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

  // Fetch conversations when the active project changes. The `active` flag
  // (same pattern as _use-traces-data.ts) keeps a slower stale response from
  // a previous project overwriting the current one on rapid sidebar
  // switching, and avoids setState after unmount (#318).
  useEffect(() => {
    if (!selectedProjectId) return;
    let active = true;
    setLoadingConversations(true);
    setConversations([]);
    setHasMore(true);
    api<{ data: Conversation[] }>(`/v1/projects/${selectedProjectId}/conversations?limit=50`)
      .then((res) => {
        if (!active) return;
        setConversations(res.data);
        setHasMore(res.data.length >= 50);
      })
      .catch((e) => {
        if (!active) return;
        toast.error(e instanceof Error ? e.message : "Failed to load data");
      })
      .finally(() => {
        if (!active) return;
        setLoadingConversations(false);
      });
    return () => {
      active = false;
    };
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
