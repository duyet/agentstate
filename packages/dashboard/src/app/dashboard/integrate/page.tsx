"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const INTEGRATION_PROMPT = `You have access to AgentState for persistent conversation storage.

API Base: https://agentstate.app/api
Auth: Bearer token in Authorization header
Full docs: https://agentstate.app/agents.md

Available operations:
- POST /api/v1/conversations - Create conversation with optional messages
- GET /api/v1/conversations - List conversations
- GET /api/v1/conversations/:id - Get conversation with all messages
- GET /api/v1/conversations/by-external-id/:eid - Lookup by your ID
- PUT /api/v1/conversations/:id - Update title/metadata
- DELETE /api/v1/conversations/:id - Delete conversation and messages
- POST /api/v1/conversations/:id/messages - Append messages
- POST /api/v1/conversations/:id/generate-title - AI title generation
- POST /api/v1/conversations/:id/follow-ups - AI follow-up suggestions

Message format: { role: "user|assistant|system|tool", content: "...", metadata: {...} }`;

export default function IntegratePage() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(INTEGRATION_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = INTEGRATION_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Integrate
        </h1>
        <p className="text-sm text-muted-foreground">
          Copy this prompt into your agent&apos;s system prompt to enable
          AgentState integration.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-8 rounded-lg border border-border/40 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          How it works
        </h2>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-muted-foreground/60 mt-0.5 shrink-0">
              1.
            </span>
            <span>
              Create a project and get your API key from the Projects tab.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-muted-foreground/60 mt-0.5 shrink-0">
              2.
            </span>
            <span>
              Copy the integration prompt below and paste it into your
              agent&apos;s system prompt.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-muted-foreground/60 mt-0.5 shrink-0">
              3.
            </span>
            <span>
              Your agent will automatically use AgentState to persist
              conversation history across sessions.
            </span>
          </li>
        </ol>
      </div>

      {/* Prompt block */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              system-prompt.txt
            </span>
            <Badge
              variant="outline"
              className="text-xs font-mono text-muted-foreground"
            >
              integration prompt
            </Badge>
          </div>
          <Button
            size="sm"
            variant={copied ? "outline" : "default"}
            className="font-mono text-xs h-7 px-3"
            onClick={handleCopy}
          >
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
        <pre className="p-5 text-sm font-mono leading-relaxed text-foreground/90 overflow-x-auto whitespace-pre-wrap bg-muted/10">
          {INTEGRATION_PROMPT}
        </pre>
      </div>

      {/* Links */}
      <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
        <Link
          href="/dashboard/docs"
          className="hover:text-foreground transition-colors"
        >
          Full API docs →
        </Link>
        <Link
          href="https://agentstate.app/agents.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          agents.md →
        </Link>
      </div>
    </div>
  );
}
