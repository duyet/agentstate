import type { ConversationResponse, ProjectDetailResponse } from "@agentstate/shared";
import { useMemo } from "react";

type Conversation = ConversationResponse;
type ProjectDetail = ProjectDetailResponse;

interface UseComputedStatsResult {
  activeKeys: ProjectDetail["api_keys"];
  totalConvs: number;
  totalMessages: number;
  totalTokens: number;
}

export function _useComputedStats(
  project: ProjectDetail | null,
  conversations: Conversation[],
): UseComputedStatsResult {
  const activeKeys = useMemo(
    () => project?.api_keys.filter((k) => !k.revoked_at) ?? [],
    [project?.api_keys],
  );

  const totalConvs = conversations.length;

  const totalMessages = useMemo(
    () => conversations.reduce((s, c) => s + c.message_count, 0),
    [conversations],
  );

  const totalTokens = useMemo(
    () => conversations.reduce((s, c) => s + c.token_count, 0),
    [conversations],
  );

  return { activeKeys, totalConvs, totalMessages, totalTokens };
}
