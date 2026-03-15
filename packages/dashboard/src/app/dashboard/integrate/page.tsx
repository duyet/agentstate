"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = INTEGRATION_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-sm font-semibold text-foreground mb-1">
          Integration
        </h1>
        <p className="text-sm text-muted-foreground">
          Add this to your agent&apos;s system prompt.
        </p>
      </div>

      <div className="rounded border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-card">
          <span className="text-xs font-mono text-muted-foreground">
            system-prompt.txt
          </span>
          <Button
            size="sm"
            variant={copied ? "outline" : "default"}
            className="font-mono text-xs h-6 px-2.5"
            onClick={handleCopy}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="p-5 text-xs font-mono leading-relaxed text-foreground/80 overflow-x-auto whitespace-pre-wrap">
          {INTEGRATION_PROMPT}
        </pre>
      </div>

      <div className="mt-5 flex items-center gap-5 text-xs text-muted-foreground font-mono">
        <Link
          href="/dashboard/docs"
          className="hover:text-foreground transition-colors"
        >
          API reference
        </Link>
        <Link
          href="https://agentstate.app/agents.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          agents.md
        </Link>
      </div>
    </div>
  );
}
