"use client";

import type { ConversationResponse, MessageResponse } from "@agentstate/shared";
import { ColumnPicker } from "./_column-picker";
import { ConversationsHeader, ConversationsContent } from "./data-tab";
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
      <ConversationsHeader
        totalConvs={totalConvs}
        showColPicker={showColPicker}
        onToggleColPicker={onToggleColPicker}
      />
      {showColPicker && (
        <ColumnPicker
          allColumns={allColumns}
          visible={visibleCols}
          onChange={onChangeColumns}
        />
      )}
      <ConversationsContent
        loading={convsLoading}
        conversations={conversations}
        columns={columns}
        expandedConv={expandedConv}
        messagesCache={messagesCache}
        loadingMessages={loadingMessages}
        visibleCols={visibleCols}
        allColumns={allColumns}
        onToggleConversation={onToggleConversation}
      />
    </>
  );
}
