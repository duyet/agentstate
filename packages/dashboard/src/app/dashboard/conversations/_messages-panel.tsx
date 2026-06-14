"use client";

import { Badge } from "@cloudflare/kumo";
import { useState } from "react";
import { MessageListSkeleton } from "@/components/dashboard/loading-states";
import { formatDate } from "@/lib/format";
import { type Message, useMessages } from "./_use-messages";

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide!">
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
    <div className="flex gap-3 border-b border-border/50 py-2.5 last:border-b-0">
      <div className="pt-0.5">
        <RoleBadge role={msg.role} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {displayed}
        </p>
        {truncated && (
          <button
            type="button"
            className="mt-1 text-[11px] text-primary hover:underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Show less of this message" : "Show more of this message"}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground">
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
      {loading && <MessageListSkeleton lines={3} />}
      {error && (
        <p className="py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {messages !== null && messages.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 italic">
          No messages in this conversation.
        </p>
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
