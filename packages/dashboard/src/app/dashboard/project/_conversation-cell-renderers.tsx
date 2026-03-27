import type { ConversationResponse } from "@agentstate/shared";
import { formatCostMicrodollars } from "@/lib/format-cost";
import type { ColumnKey } from "./_types";
import { formatDate } from "./_utils";

type Conversation = ConversationResponse;

export function renderConversationCell(conv: Conversation, col: ColumnKey): React.ReactNode {
  switch (col) {
    case "title":
      return conv.title || "Untitled";
    case "external_id":
      return <code className="font-mono text-muted-foreground">{conv.external_id || "—"}</code>;
    case "message_count":
      return <span className="tabular-nums">{conv.message_count}</span>;
    case "token_count":
      return <span className="tabular-nums">{conv.token_count.toLocaleString()}</span>;
    case "total_cost":
      return <span className="tabular-nums">{formatCostMicrodollars(conv.total_cost_microdollars)}</span>;
    case "total_tokens":
      return <span className="tabular-nums">{conv.total_tokens.toLocaleString()}</span>;
    case "metadata":
      return conv.metadata ? (
        <code className="font-mono text-muted-foreground text-xs truncate max-w-[140px] block">
          {JSON.stringify(conv.metadata)}
        </code>
      ) : (
        "—"
      );
    case "created_at":
      return <span className="text-muted-foreground">{formatDate(conv.created_at)}</span>;
    case "updated_at":
      return <span className="text-muted-foreground">{formatDate(conv.updated_at)}</span>;
  }
}
