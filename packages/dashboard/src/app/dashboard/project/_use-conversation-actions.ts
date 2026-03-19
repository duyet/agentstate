import type { MessageResponse, ProjectDetailResponse } from "@agentstate/shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;
type Message = MessageResponse;

export function _useConversationActions(project: ProjectDetail | null) {
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});

  const toggleConversation = useCallback(
    async (convId: string) => {
      if (expandedConv === convId) {
        setExpandedConv(null);
        return;
      }
      setExpandedConv(convId);
      if (!messagesCache[convId] && project) {
        setLoadingMessages((prev) => ({ ...prev, [convId]: true }));
        try {
          const res = await api<{ data: Message[] }>(
            `/v1/projects/${project.id}/conversations/${convId}/messages`,
          );
          setMessagesCache((prev) => ({ ...prev, [convId]: res.data }));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to load messages");
        } finally {
          setLoadingMessages((prev) => ({ ...prev, [convId]: false }));
        }
      }
    },
    [expandedConv, messagesCache, project],
  );

  return { expandedConv, messagesCache, loadingMessages, toggleConversation };
}
