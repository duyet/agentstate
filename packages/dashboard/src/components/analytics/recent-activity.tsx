"use client";

import { ChatCircleIcon } from "@phosphor-icons/react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LayerCard, Table } from "@cloudflare/kumo";
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
      <LayerCard className="border-dashed">
        <EmptyState
          icon={<ChatCircleIcon aria-hidden="true" />}
          title="No recent conversations"
          description="Conversation activity will appear here after your project receives messages."
        />
      </LayerCard>
    );
  }

  return (
    <LayerCard className="overflow-hidden p-0">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>Title</Table.Head>
            <Table.Head className="hidden sm:table-cell">Messages</Table.Head>
            <Table.Head className="hidden sm:table-cell">Tokens</Table.Head>
            <Table.Head className="text-right">Updated</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {conversations.map((conv) => (
            <Table.Row key={conv.id}>
              <Table.Cell className="max-w-[200px] truncate">{conv.title || "Untitled"}</Table.Cell>
              <Table.Cell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {conv.message_count}
              </Table.Cell>
              <Table.Cell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {conv.token_count.toLocaleString()}
              </Table.Cell>
              <Table.Cell className="text-right text-muted-foreground">
                {timeAgo(conv.updated_at)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </LayerCard>
  );
}
