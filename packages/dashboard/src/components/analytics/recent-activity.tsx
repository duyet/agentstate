import { MessageSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgo } from "@/lib/format";

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

export function RecentActivity({ conversations }: RecentActivityProps) {
  if (conversations.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={<MessageSquareIcon aria-hidden="true" />}
          title="No recent conversations"
          description="Conversation activity will appear here after your project receives messages."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/35 hover:bg-muted/35">
            <TableHead>Title</TableHead>
            <TableHead className="hidden sm:table-cell">Messages</TableHead>
            <TableHead className="hidden sm:table-cell">Tokens</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conv) => (
            <TableRow key={conv.id}>
              <TableCell className="max-w-[200px] truncate">{conv.title || "Untitled"}</TableCell>
              <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {conv.message_count}
              </TableCell>
              <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {conv.token_count.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {timeAgo(conv.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
