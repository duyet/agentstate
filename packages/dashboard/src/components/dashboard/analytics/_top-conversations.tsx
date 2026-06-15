import { ChatCircleIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

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
      <Card className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
          <ChatCircleIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-medium text-fg">No conversations yet</p>
          <p className="text-[12px] text-fg-3">
            Top conversations will appear after messages are stored.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-medium text-fg">Top Conversations</h3>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4">
          By message count
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((conv, index) => (
          <div key={conv.id} className="flex items-center gap-3">
            <span className="num flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-panel2 text-[11px] font-medium text-fg-2">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium text-fg">{conv.title || "Untitled"}</p>
              <p className="num text-[11px] text-fg-3">{conv.message_count} messages</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
