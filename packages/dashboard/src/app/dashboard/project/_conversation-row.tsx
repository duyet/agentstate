import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { MessageListSkeleton } from "@/components/dashboard/loading-states";
import { TableCell, TableRow } from "@/components/ui/table";
import { CONVERSATION_COLUMNS } from "./_conversation-columns";
import { renderConversationCell } from "./_conversation-cell-renderers";
import { ConversationMessage } from "./_conversation-message";
import type { ColumnKey } from "./_types";

type Conversation = ConversationResponse;
type Message = MessageResponse;

interface ConversationRowProps {
  conversation: Conversation;
  isExpanded: boolean;
  messages?: Message[];
  isLoading: boolean;
  visibleColumns: ColumnKey[];
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggle: () => void;
}

export function ConversationRow({
  conversation,
  isExpanded,
  messages,
  isLoading,
  visibleColumns,
  allColumns,
  onToggle,
}: ConversationRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={visibleColumns.length + 1} className="p-0">
        <button
          type="button"
          className="flex w-full items-center border-b border-border bg-transparent text-left hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={`Toggle ${conversation.title || "Untitled"} conversation`}
        >
          <div className="px-3 py-3 text-muted-foreground" aria-hidden="true">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </div>
          {allColumns
            .filter((c) => visibleColumns.includes(c.key))
            .map((col) => (
              <div key={col.key} className="px-4 py-3">
                {renderConversationCell(conversation, col.key)}
              </div>
            ))}
        </button>
        {isExpanded && (
          <section
            className="bg-muted/10 border-b border-border px-6 py-5"
            aria-label="Conversation messages"
          >
            {isLoading ? (
              <MessageListSkeleton lines={2} />
            ) : messages?.length ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.map((msg) => (
                  <ConversationMessage key={msg.id} message={msg} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages</p>
            )}
          </section>
        )}
      </TableCell>
    </TableRow>
  );
}

export { CONVERSATION_COLUMNS };
