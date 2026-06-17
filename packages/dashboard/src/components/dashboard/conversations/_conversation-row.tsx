import type { ConversationResponse } from "@agentstate/shared";
import { CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { formatDateShort } from "@/lib/format";
import { formatCostMicrodollars } from "@/lib/format-cost";
import { cn } from "@/lib/utils";
import { MessagesPanel } from "./_messages-panel";

export type Conversation = ConversationResponse & { project_id: string };

/**
 * ConversationRow - one clickable table row that expands to reveal the
 * conversation's messages. Plain <tr>/<td> on top of design tokens.
 */
export function ConversationRow({ conv }: { conv: Conversation }) {
  const [open, setOpen] = useState(false);
  const title = conv.title ?? "Untitled";

  const handleToggle = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === "keydown") {
      const ke = e as React.KeyboardEvent;
      if (ke.key !== "Enter" && ke.key !== " ") return;
      ke.preventDefault();
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <tr className="border-b border-edge-soft">
        <td className="py-3.5 pr-4">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 text-left py-1 transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none rounded-[var(--radius)]"
            onClick={handleToggle}
            onKeyDown={handleToggle}
            aria-expanded={open}
            aria-controls={`messages-${conv.id}`}
          >
            <CaretRight
              className={cn(
                "size-3.5 shrink-0 text-fg-4 transition-transform duration-150",
                open && "rotate-90",
              )}
              aria-hidden="true"
            />
            <span className="max-w-[200px] truncate text-[14px] font-medium text-fg sm:max-w-xs">
              {title}
            </span>
          </button>
        </td>
        <td
          suppressHydrationWarning
          className="hidden py-3.5 pr-4 text-right font-mono text-[12px] text-fg-3 num sm:table-cell"
        >
          {conv.message_count.toLocaleString()}
        </td>
        <td
          suppressHydrationWarning
          className="hidden py-3.5 pr-4 text-right font-mono text-[12px] text-fg-3 num sm:table-cell"
        >
          {conv.token_count.toLocaleString()}
        </td>
        <td className="hidden py-3.5 pr-4 text-right font-mono text-[12px] text-fg-3 num sm:table-cell">
          {formatCostMicrodollars(conv.total_cost_microdollars)}
        </td>
        <td
          suppressHydrationWarning
          className="hidden py-3.5 pr-4 font-mono text-[12px] text-fg-3 num md:table-cell"
        >
          {formatDateShort(conv.created_at)}
        </td>
        <td
          suppressHydrationWarning
          className="hidden py-3.5 pr-4 font-mono text-[12px] text-fg-3 num md:table-cell"
        >
          {formatDateShort(conv.updated_at)}
        </td>
      </tr>

      {open && (
        <tr className="bg-panel2" id={`messages-${conv.id}`}>
          <td colSpan={6} className="border-b border-edge-soft px-6 py-3">
            <MessagesPanel projectId={conv.project_id} conversationId={conv.id} />
          </td>
        </tr>
      )}
    </>
  );
}
