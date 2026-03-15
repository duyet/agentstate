"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/conversations",
    description: "Create a new conversation with optional initial messages.",
    body: `{
  "title": "optional title",
  "external_id": "your-own-id",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "metadata": {}
}`,
    response: `{
  "id": "conv_01jx...",
  "title": "New Conversation",
  "created_at": "2026-03-15T00:00:00Z"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/conversations",
    description: "List all conversations for the authenticated project.",
    body: null,
    response: `{
  "conversations": [...],
  "total": 42
}`,
  },
  {
    method: "GET",
    path: "/api/v1/conversations/:id",
    description: "Get a conversation and all its messages.",
    body: null,
    response: `{
  "id": "conv_01jx...",
  "title": "...",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/conversations/by-external-id/:eid",
    description: "Look up a conversation by your own external identifier.",
    body: null,
    response: null,
  },
  {
    method: "PUT",
    path: "/api/v1/conversations/:id",
    description: "Update conversation title or metadata.",
    body: `{
  "title": "Updated title",
  "metadata": { "tag": "support" }
}`,
    response: null,
  },
  {
    method: "DELETE",
    path: "/api/v1/conversations/:id",
    description:
      "Delete a conversation and all its messages. Irreversible.",
    body: null,
    response: null,
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/messages",
    description: "Append one or more messages to an existing conversation.",
    body: `{
  "messages": [
    { "role": "assistant", "content": "Hello!", "metadata": {} }
  ]
}`,
    response: null,
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/generate-title",
    description:
      "Use AI to generate a descriptive title based on conversation content.",
    body: null,
    response: `{ "title": "Generated title" }`,
  },
  {
    method: "POST",
    path: "/api/v1/conversations/:id/follow-ups",
    description:
      "Use AI to suggest follow-up questions or actions based on the conversation.",
    body: null,
    response: `{ "follow_ups": ["...", "..."] }`,
  },
];

const methodColors: Record<string, string> = {
  GET: "text-green-400/80",
  POST: "text-blue-400/80",
  PUT: "text-yellow-400/80",
  DELETE: "text-red-400/80",
};

export default function DocsPage() {
  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground mb-1">
          API Reference
        </h1>
        <p className="text-sm text-muted-foreground">
          AgentState REST API. All endpoints require a Bearer token.
        </p>
      </div>

      {/* Auth */}
      <section className="mb-8 rounded-lg border border-border/40 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Authentication
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Pass your API key as a Bearer token in every request:
        </p>
        <pre className="font-mono text-xs text-foreground/90 bg-muted/20 rounded px-3 py-2">
          {`Authorization: Bearer <your-api-key>`}
        </pre>
        <p className="text-xs text-muted-foreground mt-3">
          API Base URL:{" "}
          <code className="font-mono text-foreground/80">
            https://agentstate.app/api
          </code>
        </p>
      </section>

      {/* Message format */}
      <section className="mb-8 rounded-lg border border-border/40 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Message Format
        </h2>
        <pre className="font-mono text-xs text-foreground/90 bg-muted/20 rounded px-3 py-2 overflow-x-auto">
          {`{
  "role": "user | assistant | system | tool",
  "content": "message text",
  "metadata": {}        // optional arbitrary JSON
}`}
        </pre>
      </section>

      {/* Endpoints */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Endpoints
        </h2>
        <div className="space-y-4">
          {endpoints.map((ep, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border/40 overflow-hidden"
            >
              {/* Endpoint header */}
              <div className="px-4 py-3 flex items-center gap-3 bg-muted/10">
                <span
                  className={`font-mono text-xs font-bold w-14 ${methodColors[ep.method] ?? "text-foreground"}`}
                >
                  {ep.method}
                </span>
                <code className="font-mono text-sm text-foreground/90">
                  {ep.path}
                </code>
              </div>
              {/* Description */}
              <div className="px-4 py-3 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  {ep.description}
                </p>
              </div>
              {/* Body / Response */}
              {(ep.body || ep.response) && (
                <div className="border-t border-border/40">
                  {ep.body && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-mono text-muted-foreground mb-2">
                        Request body
                      </p>
                      <pre className="font-mono text-xs text-foreground/80 bg-muted/10 rounded px-3 py-2 overflow-x-auto">
                        {ep.body}
                      </pre>
                    </div>
                  )}
                  {ep.response && (
                    <div className="px-4 py-3 border-t border-border/40">
                      <p className="text-xs font-mono text-muted-foreground mb-2">
                        Response
                      </p>
                      <pre className="font-mono text-xs text-green-400/70 bg-muted/10 rounded px-3 py-2 overflow-x-auto">
                        {ep.response}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-8 bg-border/40" />

      {/* Links */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Machine-readable docs:{" "}
          <Link
            href="https://agentstate.app/agents.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-foreground/70 hover:text-foreground transition-colors"
          >
            agents.md →
          </Link>
        </span>
        <Badge
          variant="outline"
          className="font-mono text-xs text-muted-foreground"
        >
          v1
        </Badge>
      </div>
    </div>
  );
}
