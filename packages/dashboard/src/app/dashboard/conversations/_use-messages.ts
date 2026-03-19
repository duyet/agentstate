import type { MessageResponse } from "@agentstate/shared";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type Message = MessageResponse;

interface UseMessagesResult {
  messages: Message[] | null;
  loading: boolean;
  error: string | null;
}

export function useMessages(
  projectId: string,
  conversationId: string,
): UseMessagesResult {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ data: Message[] }>(
          `/v1/projects/${projectId}/conversations/${conversationId}/messages`,
        );
        setMessages(res.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, conversationId]);

  return { messages, loading, error };
}
