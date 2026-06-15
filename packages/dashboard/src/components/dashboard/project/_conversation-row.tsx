"use client";

import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { MessageListSkeleton } from "@/components/dashboard/loading-states";
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
    <>
      <tr className="border-b border-edge-soft last:border-0">
        <td colSpan={visibleColumns.length + 1} className="p-0">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center bg-transparent text-left transition-[background-color] hover:bg-panel2"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={`Toggle ${conversation.title || "Untitled"} conversation`}
          >
            <div className="px-3 py-3 text-fg-4" aria-hidden="true">
              {isExpanded ? <CaretDown aria-hidden /> : <CaretRight aria-hidden />}
            </div>
            {allColumns
              .filter((c) => visibleColumns.includes(c.key))
              .map((col) => (
                <div key={col.key} className="px-4 py-3">
                  {renderConversationCell(conversation, col.key)}
                </div>
              ))}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={visibleColumns.length + 1} className="border-b border-edge bg-panel2 p-0">
            <section className="px-6 py-5" aria-label="Conversation messages">
              {isLoading ? (
                <MessageListSkeleton lines={2} />
              ) : messages?.length ? (
                <div className="flex max-h-[500px] flex-col gap-4 overflow-y-auto">
                  {messages.map((msg) => (
                    <ConversationMessage key={msg.id} message={msg} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-fg-3">No messages</p>
              )}
            </section>
          </td>
        </tr>
      )}
    </>
  );
}

export { CONVERSATION_COLUMNS };
