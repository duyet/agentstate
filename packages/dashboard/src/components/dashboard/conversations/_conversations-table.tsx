import type { ProjectResponse } from "@agentstate/shared";
import { ChatCircle } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Conversation, ConversationRow } from "./_conversation-row";
import { CONVERSATIONS_EMPTY_STATE, getConversationsColumns } from "./_table-columns";

export interface _ConversationsTableProps {
  selectedProject: ProjectResponse | undefined;
  loading: boolean;
  conversations: Conversation[];
}

const SKELETON_ROWS = 5;

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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-edge bg-panel">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 font-mono text-[10.5px] font-normal uppercase tracking-[0.12em] text-fg-4",
                    col.className,
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                <tr key={`skeleton-${i}`} className="border-b border-edge-soft">
                  <td className="py-3.5 pr-4">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-edge" />
                  </td>
                  {[0, 1, 2, 3, 4].map((c) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
                    <td key={c} className="hidden py-3.5 pr-4 sm:table-cell">
                      <div className="ml-auto h-3.5 w-12 animate-pulse rounded bg-edge" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && conversations.length === 0 && (
              <tr className="border-b border-edge-soft">
                <td colSpan={columns.length} className="px-4 py-16">
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
                </td>
              </tr>
            )}

            {!loading &&
              conversations.length > 0 &&
              conversations.map((conv) => <ConversationRow key={conv.id} conv={conv} />)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
