import type { MessageResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Message = MessageResponse;

interface UseMessagesResult {
  messages: Message[] | null;
  loading: boolean;
  error: string | null;
}

export function useMessages(projectId: string, conversationId: string): UseMessagesResult {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ data: Message[] }>(
          `/v1/projects/${projectId}/conversations/${conversationId}/messages`,
        );
        if (!ignore) setMessages(res.data);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load messages");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [projectId, conversationId]);

  return { messages, loading, error };
}
