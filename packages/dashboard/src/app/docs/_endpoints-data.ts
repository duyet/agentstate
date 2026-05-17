export interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  group: "Conversations" | "Messages" | "Automation" | "Bulk";
}

export const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/conversations",
    description: "Create a new conversation with optional initial messages.",
    group: "Conversations",
  },
  {
    method: "GET",
    path: "/api/v1/conversations",
    description: "List all conversations for the authenticated project.",
    group: "Conversations",
  },
  {
    method: "GET",
    path: "/api/v1/conversations/:id",
    description: "Get a conversation and all its messages.",
    group: "Conversations",
  },
  {
    method: "GET",
    path: "/api/v1/conversations/by-external-id/:eid",
    description: "Look up a conversation by your own external identifier.",
    group: "Conversations",
  },
  {
    method: "PUT",
    path: "/api/v1/conversations/:id",
    description: "Update conversation title or metadata.",
    group: "Conversations",
  },
  {
    method: "DELETE",
    path: "/api/v1/conversations/:id",
    description: "Delete a conversation and all its messages. Irreversible.",
    group: "Conversations",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/export",
    description: "Export selected conversations with messages for audit or backup.",
    group: "Bulk",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/messages",
    description: "Append one or more messages to an existing conversation.",
    group: "Messages",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/generate-title",
    description: "Use AI to generate a descriptive title from conversation content.",
    group: "Automation",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/follow-ups",
    description: "Use AI to suggest follow-up questions based on the conversation.",
    group: "Automation",
  },
];
