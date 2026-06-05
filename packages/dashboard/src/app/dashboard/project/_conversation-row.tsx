import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { MessageListSkeleton } from "@/components/dashboard/loading-states";
import { TableCell, TableRow } from "@/components/ui/table";
import { renderConversationCell } from "./_conversation-cell-renderers";
import { CONVERSATION_COLUMNS } from "./_conversation-columns";
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
          className="flex w-full cursor-pointer items-center border-b border-border bg-transparent text-left transition-colors hover:bg-bg-deep/60"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={`Toggle ${conversation.title || "Untitled"} conversation`}
        >
          <div className="px-3 py-3 text-muted-foreground" aria-hidden="true">
            {isExpanded ? (
              <ChevronDownIcon aria-hidden="true" />
            ) : (
              <ChevronRightIcon aria-hidden="true" />
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
            className="border-b border-border bg-bg-deep px-6 py-5"
            aria-label="Conversation messages"
          >
            {isLoading ? (
              <MessageListSkeleton lines={2} />
            ) : messages?.length ? (
              <div className="flex max-h-[500px] flex-col gap-4 overflow-y-auto">
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
