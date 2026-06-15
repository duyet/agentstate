import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { type Message, useMessages } from "./_use-messages";

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge tone="default" className="uppercase tracking-wide">
      {role}
    </Badge>
  );
}

export function MessageRow({ msg }: { msg: Message }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 200;
  const truncated = msg.content.length > limit;
  const displayed = expanded || !truncated ? msg.content : `${msg.content.slice(0, limit)}…`;

  return (
    <div className="flex gap-3 border-b border-edge-soft py-2.5 last:border-b-0">
      <div className="pt-0.5">
        <RoleBadge role={msg.role} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-fg-2">
          {displayed}
        </p>
        {truncated && (
          <button
            type="button"
            className="mt-1 text-[11px] text-fg-4 hover:text-fg hover:underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Show less of this message" : "Show more of this message"}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      <span className="shrink-0 pt-0.5 font-mono text-[11px] text-fg-4 num">
        {formatDate(msg.created_at)}
      </span>
    </div>
  );
}

interface MessagesPanelProps {
  projectId: string;
  conversationId: string;
}

export function MessagesPanel({ projectId, conversationId }: MessagesPanelProps) {
  const { messages, loading, error } = useMessages(projectId, conversationId);

  return (
    <section aria-live="polite" aria-busy={loading}>
      {loading && (
        <div className="flex flex-col gap-2 py-1">
          {["60%", "70%", "80%"].map((w) => (
            <div key={w} className="h-3 animate-pulse rounded bg-edge" style={{ width: w }} />
          ))}
        </div>
      )}
      {error && (
        <p className="py-2 text-[12px] text-neg" role="alert">
          {error}
        </p>
      )}
      {messages !== null && messages.length === 0 && (
        <p className="py-2 text-[12px] text-fg-4">No messages in this conversation.</p>
      )}
      {messages !== null && messages.length > 0 && (
        <div>
          {messages.map((m) => (
            <MessageRow key={m.id} msg={m} />
          ))}
        </div>
      )}
    </section>
  );
}
