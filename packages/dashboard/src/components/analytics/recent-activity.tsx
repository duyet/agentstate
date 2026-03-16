import { MessageSquareIcon } from "lucide-react";

interface RecentConversation {
  id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  updated_at: number;
}

interface RecentActivityProps {
  conversations: RecentConversation[];
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity({ conversations }: RecentActivityProps) {
  if (conversations.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center">
        <MessageSquareIcon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No recent conversations</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
              Title
            </th>
            <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
              Messages
            </th>
            <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
              Tokens
            </th>
            <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((conv) => (
            <tr key={conv.id} className="border-b last:border-b-0 border-border hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2.5 truncate max-w-[200px]">
                {conv.title || "Untitled"}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground hidden sm:table-cell">
                {conv.message_count}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground hidden sm:table-cell">
                {conv.token_count.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">
                {timeAgo(conv.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
