"use client";

import type { MessageResponse } from "@agentstate/shared";
import { Markdown } from "@/components/ui/markdown";
import { Bubble, Message as MessageRow } from "@/components/ui/message";
import { formatDateTime } from "./_utils";

type Message = MessageResponse;

interface ConversationMessageProps {
  message: Message;
}

/** Small muted meta line: timestamp + token count. */
function MessageMeta({ message, align }: { message: Message; align: "left" | "right" }) {
  return (
    <p
      className={`num mt-1 font-mono text-[11px] text-muted-foreground ${align === "right" ? "text-right" : ""}`}
    >
      {formatDateTime(message.created_at)}
      {message.token_count > 0 && ` · ${message.token_count} tokens`}
    </p>
  );
}

/**
 * ConversationMessage — chat-style message rendering (assistant-ui inspired),
 * built on the shared Message/Bubble primitives (@/components/ui/message):
 * - user: end-aligned Bubble (filled muted surface, rounded-br-sm tail)
 * - assistant: start-aligned, full-width markdown, no bubble surface
 * - other roles (system / tool / …): start-aligned with a small role label
 *   header and content in a bordered muted surface
 *
 * Content is rendered as GitHub-flavored markdown via the shared Markdown
 * component so headings, lists, bold, links, and code render properly.
 */
export function ConversationMessage({ message }: ConversationMessageProps) {
  const role = message.role;

  // User → end-aligned bubble.
  if (role === "user") {
    return (
      <MessageRow align="end" footer={<MessageMeta message={message} align="right" />}>
        <Bubble variant="default" align="end">
          <Markdown content={message.content} />
        </Bubble>
      </MessageRow>
    );
  }

  // Assistant → full-width markdown, no bubble surface.
  if (role === "assistant") {
    return (
      <MessageRow align="start" footer={<MessageMeta message={message} align="left" />}>
        <div className="min-w-0 max-w-[95%]">
          <Markdown content={message.content} />
        </div>
      </MessageRow>
    );
  }

  // Other roles (system / tool / …) → labeled, bordered muted surface.
  return (
    <MessageRow
      align="start"
      header={<span className="mb-1 text-xs uppercase text-muted-foreground">{role}</span>}
      footer={<MessageMeta message={message} align="left" />}
    >
      <div className="min-w-0 max-w-[95%] rounded-lg border border-border bg-muted/40 px-3 py-2">
        <Markdown content={message.content} />
      </div>
    </MessageRow>
  );
}
