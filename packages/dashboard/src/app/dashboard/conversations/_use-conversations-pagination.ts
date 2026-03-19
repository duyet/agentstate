import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Conversation } from "./_use-conversations-data";

interface UseConversationsPaginationResult {
  isLoadingMore: boolean;
  loadMore: () => void;
}

export function _useConversationsPagination(
  selectedProjectId: string,
  conversations: Conversation[],
  appendConversations: (newConversations: Conversation[]) => void,
  setHasMore: (value: boolean) => void,
  hasMore: boolean,
): UseConversationsPaginationResult {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = useCallback(() => {
    if (!selectedProjectId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const lastConv = conversations[conversations.length - 1];
    const cursor = lastConv?.updated_at?.toString();

    api<{ data: Conversation[] }>(
      `/v1/projects/${selectedProjectId}/conversations?limit=50&cursor=${cursor}`,
    )
      .then((res) => {
        appendConversations(res.data);
        setHasMore(res.data.length >= 50);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load more"))
      .finally(() => setIsLoadingMore(false));
  }, [selectedProjectId, isLoadingMore, hasMore, conversations, appendConversations, setHasMore]);

  return { isLoadingMore, loadMore };
}
