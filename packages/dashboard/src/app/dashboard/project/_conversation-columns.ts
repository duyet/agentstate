import type { ColumnKey } from "./_types";

export const CONVERSATION_COLUMNS: readonly { key: ColumnKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "external_id", label: "External ID" },
  { key: "message_count", label: "Messages" },
  { key: "token_count", label: "Tokens" },
  { key: "metadata", label: "Metadata" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
] as const;
