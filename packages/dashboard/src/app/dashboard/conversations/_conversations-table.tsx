import type { ProjectResponse } from "@agentstate/shared";
import { MessageSquareIcon } from "lucide-react";
import { DataTable } from "@/components/dashboard/data-table";
import { type Conversation, ConversationRow } from "./_conversation-row";
import { CONVERSATIONS_EMPTY_STATE, getConversationsColumns } from "./_table-columns";

export interface _ConversationsTableProps {
  selectedProject: ProjectResponse | undefined;
  loading: boolean;
  conversations: Conversation[];
}

export function _ConversationsTable({
  selectedProject,
  loading,
  conversations,
}: _ConversationsTableProps) {
  return (
    <DataTable
      data={conversations}
      columns={getConversationsColumns(selectedProject)}
      loading={loading}
      loadingRows={5}
      empty={{
        ...CONVERSATIONS_EMPTY_STATE,
        icon: <MessageSquareIcon className="h-6 w-6 text-muted-foreground" />,
      }}
      rowKey={(conv) => conv.id}
      renderRow={(conv) => <ConversationRow key={conv.id} conv={conv} />}
    />
  );
}
