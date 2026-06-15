"use client";

import { ChatCircleIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
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
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-edge bg-panel2/50">
            <th className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4">
              Title
            </th>
            <th className="hidden px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4 sm:table-cell">
              Messages
            </th>
            <th className="hidden px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4 sm:table-cell">
              Tokens
            </th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((conv) => (
            <tr key={conv.id} className="border-b border-edge-soft last:border-0">
              <td className="max-w-[200px] truncate px-4 py-2.5 text-fg">
                {conv.title || "Untitled"}
              </td>
              <td className="num hidden px-4 py-2.5 text-fg-3 sm:table-cell">
                {conv.message_count}
              </td>
              <td className="num hidden px-4 py-2.5 text-fg-3 sm:table-cell">
                {conv.token_count.toLocaleString()}
              </td>
              <td className="num px-4 py-2.5 text-right text-fg-3">{timeAgo(conv.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
