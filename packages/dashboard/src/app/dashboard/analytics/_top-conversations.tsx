import { MessageSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      <Card className="h-full min-h-[200px] border-dashed">
        <EmptyState
          icon={<MessageSquareIcon aria-hidden="true" />}
          title="No conversations yet"
          description="Top conversations will appear after messages are stored."
        />
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Conversations</CardTitle>
        <CardDescription>By message count</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
      </CardContent>
    </Card>
  );
}
