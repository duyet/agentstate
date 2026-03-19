const endpoints = [
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

const methodColor: Record<string, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  DELETE: "text-red-400",
};

export function EndpointsTable() {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Endpoints
      </h2>
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full" aria-label="API endpoints">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium w-16">
                Method
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium">
                Endpoint
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium hidden sm:table-cell">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr
                key={`${ep.method}-${ep.path}`}
                className={`${
                  endpoints.indexOf(ep) < endpoints.length - 1 ? "border-b border-border" : ""
                } hover:bg-muted/20 transition-colors`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`font-mono text-xs font-bold ${methodColor[ep.method] ?? "text-foreground"}`}
                  >
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <code className="font-mono text-xs text-foreground/85 break-all">{ep.path}</code>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground">{ep.description}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
