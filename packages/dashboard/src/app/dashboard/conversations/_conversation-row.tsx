"use client";

import type { ConversationResponse } from "@agentstate/shared";
import { Table } from "@cloudflare/kumo";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { formatDateShort } from "@/lib/format";
import { formatCostMicrodollars } from "@/lib/format-cost";
import { cn } from "@/lib/utils";
import { MessagesPanel } from "./_messages-panel";

export type Conversation = ConversationResponse & { project_id: string };

export function ConversationRow({ conv }: { conv: Conversation }) {
  const [open, setOpen] = useState(false);
  const title = conv.title ?? "Untitled";

  return (
    <>
      <Table.Row
        className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-controls={`messages-${conv.id}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <Table.Cell className="py-3.5">
          <div className="flex items-center gap-2.5">
            <CaretRightIcon
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                open && "rotate-90",
              )}
              aria-hidden="true"
            />
            <span className="max-w-[200px] truncate text-sm font-medium text-foreground sm:max-w-xs">
              {title}
            </span>
          </div>
        </Table.Cell>
        <Table.Cell
          suppressHydrationWarning
          className="hidden font-mono text-xs text-muted-foreground sm:table-cell"
        >
          {conv.message_count.toLocaleString()}
        </Table.Cell>
        <Table.Cell
          suppressHydrationWarning
          className="hidden font-mono text-xs text-muted-foreground sm:table-cell"
        >
          {conv.token_count.toLocaleString()}
        </Table.Cell>
        <Table.Cell className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:table-cell">
          {formatCostMicrodollars(conv.total_cost_microdollars)}
        </Table.Cell>
        <Table.Cell className="hidden text-xs text-muted-foreground md:table-cell">
          {formatDateShort(conv.created_at)}
        </Table.Cell>
        <Table.Cell className="hidden text-xs text-muted-foreground md:table-cell">
          {formatDateShort(conv.updated_at)}
        </Table.Cell>
      </Table.Row>

      {open && (
        <Table.Row className="bg-muted hover:bg-muted" id={`messages-${conv.id}`}>
          <Table.Cell colSpan={6} className="bg-muted px-6 py-3">
            <MessagesPanel projectId={conv.project_id} conversationId={conv.id} />
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
}
