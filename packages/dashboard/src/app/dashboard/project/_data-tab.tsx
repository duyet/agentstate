"use client";

import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { DataTable } from "@/components/dashboard/data-table";
import { ConversationRowSkeleton } from "@/components/dashboard/loading-states";
import { Button } from "@/components/ui/button";
import { ColumnPicker } from "./_column-picker";
import { ConversationRow } from "./_conversation-row";
import { _ConversationsEmptyState } from "./_conversations-empty-state";
import type { ColumnKey } from "./_types";

type Conversation = ConversationResponse;
type Message = MessageResponse;

interface DataTabProps {
  totalConvs: number;
  convsLoading: boolean;
  conversations: Conversation[];
  expandedConv: string | null;
  messagesCache: Record<string, Message[]>;
  loadingMessages: Record<string, boolean>;
  visibleCols: ColumnKey[];
  showColPicker: boolean;
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggleConversation: (convId: string) => void;
  onToggleColPicker: () => void;
  onChangeColumns: (columns: ColumnKey[]) => void;
}

export function _DataTab({
  totalConvs,
  convsLoading,
  conversations,
  expandedConv,
  messagesCache,
  loadingMessages,
  visibleCols,
  showColPicker,
  allColumns,
  onToggleConversation,
  onToggleColPicker,
  onChangeColumns,
}: DataTabProps) {
  const columns = [
    { key: "expand", label: "" },
    ...allColumns
      .filter((c) => visibleCols.includes(c.key))
      .map((col) => ({ key: col.key, label: col.label })),
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {totalConvs} conversation{totalConvs !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={onToggleColPicker}
            aria-expanded={showColPicker}
            aria-haspopup="menu"
          >
            Columns
          </Button>
          {showColPicker && (
            <ColumnPicker
              allColumns={allColumns}
              visible={visibleCols}
              onChange={onChangeColumns}
            />
          )}
        </div>
      </div>
      {convsLoading ? (
        <ConversationRowSkeleton rows={3} />
      ) : conversations.length > 0 ? (
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
      ) : (
        <_ConversationsEmptyState />
      )}
    </>
  );
}
