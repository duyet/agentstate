import { MessageSquareIcon } from "lucide-react";
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
      <Card className="p-8 flex flex-col items-center justify-center text-center border-dashed h-full min-h-[200px]">
        <MessageSquareIcon className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Top Conversations</h3>
        <p className="text-xs text-muted-foreground mt-1">By message count</p>
      </div>
      <div className="p-4 space-y-3">
        {sorted.map((conv, index) => (
          <div key={conv.id} className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{conv.title || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{conv.message_count} messages</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
