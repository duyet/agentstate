import type { ProjectResponse } from "@agentstate/shared";
import { ChatCircle } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "@/components/ui/table";
import { type Conversation, ConversationRow } from "./_conversation-row";
import { CONVERSATIONS_EMPTY_STATE, getConversationsColumns } from "./_table-columns";

export interface _ConversationsTableProps {
  selectedProject: ProjectResponse | undefined;
  loading: boolean;
  conversations: Conversation[];
}

/**
 * Conversations table — plain <table> on design tokens. Handles loading
 * (skeleton rows) and empty state inline; no shared DataTable/Kumo dependency.
 * Cursor pagination is preserved verbatim by the parent (see conversations-page).
 */
export function _ConversationsTable({
  selectedProject,
  loading,
  conversations,
}: _ConversationsTableProps) {
  const columns = getConversationsColumns(selectedProject);

  return (
    <Card className="overflow-hidden p-0">
      <Table responsive>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} align={col.align} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && <TableSkeleton columns={columns.length} rows={5} />}

          {!loading && conversations.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-4 py-16">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
                    <ChatCircle className="size-6" aria-hidden />
                  </div>
                  <div className="flex max-w-xs flex-col gap-1">
                    <p className="text-[14px] font-medium text-fg">
                      {CONVERSATIONS_EMPTY_STATE.title}
                    </p>
                    <p className="text-[12.5px] leading-5 text-fg-4">
                      {CONVERSATIONS_EMPTY_STATE.description}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            conversations.length > 0 &&
            conversations.map((conv) => <ConversationRow key={conv.id} conv={conv} />)}
        </TableBody>
      </Table>
    </Card>
  );
}
