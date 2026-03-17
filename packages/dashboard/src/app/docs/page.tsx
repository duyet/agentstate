import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Footer } from "@/components/footer";

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

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-3 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <span className="font-mono text-sm font-semibold tracking-tight">API Reference</span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="https://github.com/duyet/agentstate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              GitHub
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight text-foreground mb-1">API Reference</h1>
            <p className="text-sm text-muted-foreground">
              REST API. All endpoints require a Bearer token.
            </p>
          </div>

          {/* Auth */}
          <section className="mb-8">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
              Authentication
            </h2>
            <p className="text-sm text-muted-foreground mb-3">Pass your API key in every request:</p>
            <pre className="font-mono text-xs text-foreground/80 bg-card border border-border rounded px-4 py-3">
              {`Authorization: Bearer <your-api-key>`}
            </pre>
            <p className="text-xs text-muted-foreground mt-3">
              Base URL: <code className="font-mono text-foreground/70">https://agentstate.app/api</code>
            </p>
          </section>

          {/* Message format */}
          <section className="mb-8">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
              Message Format
            </h2>
            <pre className="font-mono text-xs text-foreground/80 bg-card border border-border rounded px-4 py-3 overflow-x-auto">
              {`{
  "role": "user | assistant | system | tool",
  "content": "message text",
  "metadata": {}
}`}
            </pre>
          </section>

          {/* Endpoints table */}
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
                        <code className="font-mono text-xs text-foreground/85 break-all">
                          {ep.path}
                        </code>
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

          <div className="border-t border-border pt-6 text-xs text-muted-foreground font-mono">
            Machine-readable:{" "}
            <Link
              href="https://agentstate.app/agents.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              agents.md
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
