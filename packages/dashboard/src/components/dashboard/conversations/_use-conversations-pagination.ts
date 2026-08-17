import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Conversation } from "./_use-conversations-data";

interface UseConversationsPaginationResult {
  isLoadingMore: boolean;
  loadMore: () => void;
}

export function useConversationsPagination(
  selectedProjectId: string,
  nextCursor: string | null,
  appendConversations: (newConversations: Conversation[]) => void,
  setHasMore: (value: boolean) => void,
  setNextCursor: (value: string | null) => void,
  hasMore: boolean,
): UseConversationsPaginationResult {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = useCallback(() => {
    if (!selectedProjectId || isLoadingMore || !hasMore || !nextCursor) return;

    setIsLoadingMore(true);

    api<{ data: Conversation[]; has_more?: boolean; next_cursor?: string | null }>(
      `/v1/projects/${selectedProjectId}/conversations?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
    )
      .then((res) => {
        appendConversations(res.data);
        const cursor = res.next_cursor ?? null;
        setNextCursor(cursor);
        setHasMore(Boolean(res.has_more && cursor));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load more"))
      .finally(() => setIsLoadingMore(false));
  }, [
    selectedProjectId,
    isLoadingMore,
    hasMore,
    nextCursor,
    appendConversations,
    setHasMore,
    setNextCursor,
  ]);

  return { isLoadingMore, loadMore };
}
