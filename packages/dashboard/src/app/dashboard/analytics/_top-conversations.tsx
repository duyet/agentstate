"use client";

import { ChatCircleIcon } from "@phosphor-icons/react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LayerCard, Text } from "@cloudflare/kumo";

interface ConversationData {
  id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  updated_at: number;
}

interface TopConversationsProps {
  conversations: ConversationData[];
  limit?: number;
}

export function TopConversations({ conversations, limit = 5 }: TopConversationsProps) {
  const sorted = [...conversations]
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <LayerCard className="h-full min-h-[200px] border-dashed">
        <EmptyState
          icon={<ChatCircleIcon aria-hidden="true" />}
          title="No conversations yet"
          description="Top conversations will appear after messages are stored."
        />
      </LayerCard>
    );
  }

  return (
    <LayerCard className="h-full p-5">
      <div className="flex flex-col gap-1">
        <Text variant="heading3" as="h3">
          Top Conversations
        </Text>
        <Text variant="secondary" as="p">
          By message count
        </Text>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((conv, index) => (
          <div key={conv.id} className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium tabular-nums">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{conv.title || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{conv.message_count} messages</p>
            </div>
          </div>
        ))}
      </div>
    </LayerCard>
  );
}
