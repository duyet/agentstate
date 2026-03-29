import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { DataTable } from "@/components/dashboard/data-table";
import { ConversationRowSkeleton } from "@/components/dashboard/loading-states";
import type { ColumnKey } from "../_types";
import { ConversationRow } from "../_conversation-row";
import { _ConversationsEmptyState } from "../_conversations-empty-state";

type Conversation = ConversationResponse;
type Message = MessageResponse;

interface ConversationsContentProps {
  loading: boolean;
  conversations: Conversation[];
  columns: Array<{ key: ColumnKey; label: string }>;
  expandedConv: string | null;
  messagesCache: Record<string, Message[]>;
  loadingMessages: Record<string, boolean>;
  visibleCols: ColumnKey[];
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggleConversation: (convId: string) => void;
}

export function ConversationsContent({
  loading,
  conversations,
  columns,
  expandedConv,
  messagesCache,
  loadingMessages,
  visibleCols,
  allColumns,
  onToggleConversation,
}: ConversationsContentProps) {
  if (loading) {
    return <ConversationRowSkeleton rows={3} />;
  }

  if (conversations.length === 0) {
    return <_ConversationsEmptyState />;
  }

  return (
    <DataTable
      data={conversations}
      columns={columns}
      rowKey={(conv) => conv.id}
      renderRow={(conv) => (
        <ConversationRow
          key={conv.id}
          conversation={conv}
          isExpanded={expandedConv === conv.id}
          messages={messagesCache[conv.id]}
          isLoading={loadingMessages[conv.id] || false}
          visibleColumns={visibleCols}
          allColumns={allColumns}
          onToggle={() => onToggleConversation(conv.id)}
        />
      )}
    />
  );
}
