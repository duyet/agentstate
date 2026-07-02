import type { ConversationResponse, TraceDetailResponse } from "@agentstate/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export type TraceItem = Pick<
  ConversationResponse,
  "id" | "title" | "message_count" | "total_tokens" | "total_cost_microdollars" | "created_at"
>;

interface UseTracesDataResult {
  traces: TraceItem[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
}

/**
 * Fetches the trace list for the active project and exposes cursor pagination.
 * Mirrors `useConversationsData`/`useConversationsPagination` in ../conversations.
 */
export function useTracesData(selectedProjectId: string): UseTracesDataResult {
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const projectIdRef = useRef(selectedProjectId);

  useEffect(() => {
    projectIdRef.current = selectedProjectId;
    if (!selectedProjectId) return;
    let active = true;
    setLoading(true);
    setTraces([]);
    setHasMore(false);
    api<{ data: TraceItem[]; has_more: boolean }>(
      `/v1/projects/${selectedProjectId}/traces?limit=50`,
    )
      .then((res) => {
        if (!active) return;
        setTraces(res.data);
        setHasMore(res.has_more);
      })
      .catch((e) => {
        if (!active) return;
        toast.error(e instanceof Error ? e.message : "Failed to load traces");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || traces.length === 0 || !selectedProjectId) return;
    const cursor = traces[traces.length - 1].created_at.toString();
    setLoadingMore(true);
    api<{ data: TraceItem[]; has_more: boolean }>(
      `/v1/projects/${selectedProjectId}/traces?limit=50&cursor=${cursor}`,
    )
      .then((res) => {
        if (projectIdRef.current !== selectedProjectId) return;
        setTraces((prev) => [...prev, ...res.data]);
        setHasMore(res.has_more);
      })
      .catch((e) => {
        if (projectIdRef.current !== selectedProjectId) return;
        toast.error(e instanceof Error ? e.message : "Failed to load more");
      })
      .finally(() => {
        if (projectIdRef.current !== selectedProjectId) return;
        setLoadingMore(false);
      });
  }, [loadingMore, hasMore, traces, selectedProjectId]);

  return { traces, loading, hasMore, loadingMore, loadMore };
}

/**
 * Fetches the observation-tree detail for the selected trace id.
 */
export function useTraceDetail(selectedProjectId: string, selectedId: string | null) {
  const [detail, setDetail] = useState<TraceDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedId || !selectedProjectId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    api<TraceDetailResponse>(`/v1/projects/${selectedProjectId}/traces/${selectedId}`)
      .then((res) => {
        if (!active) return;
        setDetail(res);
      })
      .catch((e) => {
        if (!active) return;
        toast.error(e instanceof Error ? e.message : "Failed to load trace detail");
      })
      .finally(() => {
        if (!active) return;
        setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectedProjectId]);

  return { detail, loadingDetail };
}
