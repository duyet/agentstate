import type { ConversationResponse } from "@agentstate/shared";
import { formatCostMicrodollars } from "@/lib/format-cost";
import type { ColumnKey } from "./_types";
import { formatDate } from "./_utils";

type Conversation = ConversationResponse;

export function renderConversationCell(conv: Conversation, col: ColumnKey): React.ReactNode {
  switch (col) {
    case "title":
      return <span className="text-[13px] font-medium text-fg">{conv.title || "Untitled"}</span>;
    case "external_id":
      return <code className="num font-mono text-xs text-fg-3">{conv.external_id || "—"}</code>;
    case "message_count":
      return (
        <span className="num font-mono text-xs tabular-nums text-fg-3">{conv.message_count}</span>
      );
    case "token_count":
      return (
        <span suppressHydrationWarning className="num font-mono text-xs tabular-nums text-fg-3">
          {conv.token_count.toLocaleString()}
        </span>
      );
    case "total_cost":
      return (
        <span className="num font-mono text-xs tabular-nums text-fg-3">
          {formatCostMicrodollars(conv.total_cost_microdollars)}
        </span>
      );
    case "total_tokens":
      return (
        <span suppressHydrationWarning className="num font-mono text-xs tabular-nums text-fg-3">
          {conv.total_tokens.toLocaleString()}
        </span>
      );
    case "metadata":
      return conv.metadata ? (
        <code className="num block max-w-[140px] truncate font-mono text-xs text-fg-3">
          {JSON.stringify(conv.metadata)}
        </code>
      ) : (
        "—"
      );
    case "created_at":
      return <span className="text-xs text-fg-3">{formatDate(conv.created_at)}</span>;
    case "updated_at":
      return <span className="text-xs text-fg-3">{formatDate(conv.updated_at)}</span>;
  }
}
