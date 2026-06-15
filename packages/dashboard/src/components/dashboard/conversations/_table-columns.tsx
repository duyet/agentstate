import type { ProjectResponse } from "@agentstate/shared";
import type { Column } from "@/components/dashboard/data-table";
import type { Conversation } from "./_conversation-row";

export function getConversationsColumns(
  selectedProject: ProjectResponse | undefined,
): Column<Conversation>[] {
  return [
    {
      key: "title",
      label: selectedProject ? (
        <span>
          Title
          <span className="ml-1.5 text-muted-foreground/60 font-normal">
            — {selectedProject.name}
          </span>
        </span>
      ) : (
        "Title"
      ),
    },
    { key: "messages", label: "Messages", className: "hidden sm:table-cell" },
    { key: "tokens", label: "Tokens", className: "hidden sm:table-cell" },
    { key: "cost", label: "Cost", className: "hidden sm:table-cell" },
    { key: "created", label: "Created", className: "hidden md:table-cell" },
    { key: "updated", label: "Updated", className: "hidden md:table-cell" },
  ];
}

export const CONVERSATIONS_EMPTY_STATE = {
  icon: null,
  title: "No conversations yet",
  description: "Conversations will appear here once your agents start logging to this project.",
} as const;
