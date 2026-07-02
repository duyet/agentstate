"use client";

import type { MessageResponse } from "@agentstate/shared";
import { Markdown } from "@/components/ui/markdown";
import { formatDateTime } from "./_utils";

type Message = MessageResponse;

interface ConversationMessageProps {
  message: Message;
}

/** Small muted meta line: timestamp + token count. */
function MessageMeta({ message, align }: { message: Message; align: "left" | "right" }) {
  return (
    <p
      className={`num mt-1 font-mono text-[11px] text-fg-4 ${align === "right" ? "text-right" : ""}`}
    >
      {formatDateTime(message.created_at)}
      {message.token_count > 0 && ` · ${message.token_count} tokens`}
    </p>
  );
}

/**
 * ConversationMessage — chat-style message rendering (assistant-ui inspired):
 * - user: right-aligned bubble
 * - assistant: left-aligned, full width, markdown body
 * - other roles (system / tool / …): left-aligned with a small role label
 *
 * Content is rendered as GitHub-flavored markdown via the shared Markdown
 * component so headings, lists, bold, links, and code render properly.
 */
export function ConversationMessage({ message }: ConversationMessageProps) {
  const role = message.role;

  // User → right-aligned bubble.
  if (role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[85%] rounded-[var(--radius-xl)] rounded-br-[var(--radius-sm)] border border-edge bg-panel px-3.5 py-2.5">
          <Markdown content={message.content} />
        </div>
        <MessageMeta message={message} align="right" />
      </div>
    );
  }

  const isAssistant = role === "assistant";

  // Assistant → full-width markdown. Other roles → labeled left block.
  return (
    <div className="flex flex-col items-start">
      {!isAssistant && <span className="as-label-xs mb-1 text-fg-4">{role}</span>}
      <div className="min-w-0 max-w-[95%]">
        <Markdown content={message.content} />
      </div>
      <MessageMeta message={message} align="left" />
    </div>
  );
}
