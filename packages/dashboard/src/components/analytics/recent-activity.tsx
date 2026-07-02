"use client";

import { ChatCircleIcon } from "@phosphor-icons/react";
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
      <Card className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
          <ChatCircleIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-medium text-fg">No recent conversations</p>
          <p className="text-[12px] text-fg-3">
            Conversation activity will appear here after your project receives messages.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="hidden sm:table-cell">Messages</TableHead>
            <TableHead className="hidden sm:table-cell">Tokens</TableHead>
            <TableHead align="right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conv) => (
            <TableRow key={conv.id}>
              <TableCell className="max-w-[200px] truncate text-fg">
                {conv.title || "Untitled"}
              </TableCell>
              <TableCell className="hidden sm:table-cell" mono>
                {conv.message_count}
              </TableCell>
              <TableCell className="hidden sm:table-cell" mono>
                {conv.token_count.toLocaleString()}
              </TableCell>
              <TableCell align="right" mono>
                {timeAgo(conv.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
