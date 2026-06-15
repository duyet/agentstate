import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { ConversationRowSkeleton } from "@/components/dashboard/loading-states";
import { Card } from "@/components/ui/card";
import { ConversationRow } from "../_conversation-row";
import { _ConversationsEmptyState } from "../_conversations-empty-state";
import type { ColumnKey } from "../_types";

type Conversation = ConversationResponse;
type Message = MessageResponse;

interface ConversationsContentProps {
  loading: boolean;
  conversations: Conversation[];
  columns: Array<{ key: ColumnKey | "expand"; label: string }>;
  expandedConv: string | null;
  messagesCache: Record<string, Message[]>;
  loadingMessages: Record<string, boolean>;
  visibleCols: ColumnKey[];
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggleConversation: (convId: string) => void;
}

/**
 * Conversations content — plain <table> on design tokens (no shared Kumo
 * DataTable). Loading skeleton, empty state, and expandable rows are all
 * rendered inline. Behavior is identical to the previous DataTable usage.
 */
export function ConversationsContent({
  loading,
  conversations,
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
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <tbody>
            {conversations.map((conv) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
