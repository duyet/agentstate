import type { ProjectResponse } from "@agentstate/shared";
import type { ReactNode } from "react";

/**
 * Column header config for the conversations table. The table itself is a
 * hand-built <table>; this just describes header label + responsive class.
 */
export interface ConversationColumn {
  key: string;
  label: ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function getConversationsColumns(
  selectedProject: ProjectResponse | undefined,
): ConversationColumn[] {
  return [
    {
      key: "title",
      label: selectedProject ? (
        <span>
          Title
          <span className="ml-1.5 font-normal text-fg-4">— {selectedProject.name}</span>
        </span>
      ) : (
        "Title"
      ),
    },
    { key: "messages", label: "Messages", className: "hidden sm:table-cell", align: "right" },
    { key: "tokens", label: "Tokens", className: "hidden sm:table-cell", align: "right" },
    { key: "cost", label: "Cost", className: "hidden sm:table-cell", align: "right" },
    { key: "created", label: "Created", className: "hidden md:table-cell", align: "right" },
    { key: "updated", label: "Updated", className: "hidden md:table-cell", align: "right" },
  ];
}

export const CONVERSATIONS_EMPTY_STATE = {
  icon: null,
  title: "No conversations yet",
  description: "Conversations will appear here once your agents start logging to this project.",
} as const;
