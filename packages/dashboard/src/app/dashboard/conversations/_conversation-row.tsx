import type { ConversationResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateShort } from "@/lib/format";
import { formatCostMicrodollars } from "@/lib/format-cost";
import { MessagesPanel } from "./_messages-panel";

export type Conversation = ConversationResponse & { project_id: string };

export function ConversationRow({ conv }: { conv: Conversation }) {
  const [open, setOpen] = useState(false);
  const title = conv.title ?? "Untitled";
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;

  return (
    <>
      <TableRow
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
        <TableCell>
          <div className="flex items-center gap-2">
            <Chevron className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-[200px] truncate text-sm text-foreground sm:max-w-xs">
              {title}
            </span>
          </div>
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
          {conv.message_count.toLocaleString()}
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
          {conv.token_count.toLocaleString()}
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground tabular-nums sm:table-cell">
          {formatCostMicrodollars(conv.total_cost_microdollars)}
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
          {formatDateShort(conv.created_at)}
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
          {formatDateShort(conv.updated_at)}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/10" id={`messages-${conv.id}`}>
          <TableCell colSpan={6} className="bg-muted/15 px-6 py-3">
            <MessagesPanel projectId={conv.project_id} conversationId={conv.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
