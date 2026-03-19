export interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
}

export const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/conversations",
    description: "Create a new conversation with optional initial messages.",
  },
  {
    method: "GET",
    path: "/api/v1/conversations",
    description: "List all conversations for the authenticated project.",
  },
  {
    method: "GET",
    path: "/api/v1/conversations/:id",
    description: "Get a conversation and all its messages.",
  },
  {
    method: "GET",
    path: "/api/v1/conversations/by-external-id/:eid",
    description: "Look up a conversation by your own external identifier.",
  },
  {
    method: "PUT",
    path: "/api/v1/conversations/:id",
    description: "Update conversation title or metadata.",
  },
  {
    method: "DELETE",
    path: "/api/v1/conversations/:id",
    description: "Delete a conversation and all its messages. Irreversible.",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/messages",
    description: "Append one or more messages to an existing conversation.",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/generate-title",
    description: "Use AI to generate a descriptive title from conversation content.",
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/follow-ups",
    description: "Use AI to suggest follow-up questions based on the conversation.",
  },
];

export const methodColor: Record<Endpoint["method"], string> = {
  GET: "text-emerald-500",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  DELETE: "text-red-400",
};
