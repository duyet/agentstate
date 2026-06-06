"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Pill } from "@/components/brand/bits";
import { CodeBlock } from "@/components/brand/code-block";
import { FRAMEWORKS, type FrameworkId, FwGlyph } from "@/components/brand/frameworks";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Per-framework adapter snippets — copy one of these and you're persisting state.
const ADAPTER_SNIPPETS: Record<FrameworkId, string> = {
  vercel: `import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AgentState } from "@agentstate/sdk";

const state = new AgentState({ apiKey: AS_KEY });
const conv = await state.getConversation(id);

const { text } = await generateText({
  model: openai("gpt-4o"),
  messages: conv.messages,
});
await state.appendMessages(id, [
  { role: "assistant", content: text },
]);`,
  tanstack: `import { AgentState } from "@agentstate/sdk";
import { createTanStackStore } from "@agentstate/sdk/tanstack";

const state = new AgentState({ apiKey: AS_KEY });
const store = createTanStackStore(state, {
  queryKey: ["chat", chatId],
});

// reads + writes flow through TanStack cache
const messages = await store.load(chatId);
await store.append(chatId, turn);`,
  langgraph: `import { AgentState } from "@agentstate/sdk";
import { AgentStateCheckpointSaver } from "@agentstate/sdk/langgraph";

const client = new AgentState({ apiKey: AS_KEY });
const saver = new AgentStateCheckpointSaver(client);

await saver.put(
  { configurable: { thread_id: "thread-1" } },
  { id: "cp-1", values: {} },
  { step: 0 }, {},
);`,
  cfagents: `import { Agent } from "agents";
import { AgentState } from "@agentstate/sdk";

export class ChatAgent extends Agent<Env> {
  state = new AgentState({ apiKey: this.env.AS_KEY });

  async onMessage(conn, message) {
    const conv = await this.state.getConversation(this.id);
    // ...generate reply, then persist
    await this.state.appendMessages(this.id, turns);
  }
}`,
  workersai: `import { AgentState } from "@agentstate/sdk";

export default {
  async fetch(req, env) {
    const state = new AgentState({ apiKey: env.AS_KEY });
    const conv = await state.getConversation(id);
    const out = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
      { messages: conv.messages },
    );
    await state.appendMessages(id, [out]);
  },
};`,
  openai: `import OpenAI from "openai";
import { AgentState } from "@agentstate/sdk";

const ai = new OpenAI();
const state = new AgentState({ apiKey: AS_KEY });

const conv = await state.getConversation(id);
const res = await ai.chat.completions.create({
  model: "gpt-4o",
  messages: conv.messages,
});
await state.appendMessages(id, [res.choices[0].message]);`,
  rest: `# create a conversation
curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer as_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Hi"}]}'

# retrieve it later
curl https://agentstate.app/api/v1/conversations/:id \\
  -H "Authorization: Bearer as_live_..."`,
};

const INTEGRATION_PROMPT = `Integrate AgentState into this project for persistent conversation storage.

Read the full integration guide and implement it:
https://agentstate.app/agents.md

API Base: https://agentstate.app/api
Auth: Bearer token in Authorization header (key starts with as_live_)

After reading agents.md, store all conversation turns via the API so history persists across sessions.`;

export default function IntegratePage() {
  const [fw, setFw] = useState<FrameworkId>("vercel");
  const active = FRAMEWORKS.find((f) => f.id === fw) ?? FRAMEWORKS[0];
  const isCurl = fw === "rest";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Integrate"
        description="Pick your framework — copy the adapter and you're persisting state."
      />

      {/* Adapter switcher */}
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[230px_1fr]">
        {/* Framework list */}
        <div className="flex flex-col gap-1.5">
          {FRAMEWORKS.map((f) => {
            const selected = f.id === fw;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFw(f.id)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-[11px] rounded-lg border px-3 py-[11px] text-left transition-all",
                  selected
                    ? "border-foreground bg-card shadow-sm"
                    : "border-border bg-bg-deep hover:border-line-soft",
                )}
              >
                <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[7px] border border-border bg-card">
                  <FwGlyph kind={f.glyph} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-foreground">
                    {f.name}
                  </span>
                  <span className="block font-mono text-[10.5px] text-faint">{f.tag}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Active framework detail */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5 rounded-lg border border-border bg-card p-[18px]">
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-[9px] border border-border bg-bg-deep">
              <FwGlyph kind={active.glyph} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[17px] font-semibold text-foreground">
                {active.name}
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                {isCurl ? "no SDK required · raw REST" : "npm i @agentstate/sdk"}
              </div>
            </div>
            <Pill>
              <span className="size-1.5 rounded-full bg-brand" />
              ready
            </Pill>
          </div>

          <CodeBlock code={ADAPTER_SNIPPETS[fw]} title={isCurl ? "terminal" : `${active.tag}.ts`} />

          <div className="flex items-center justify-between rounded-lg border border-border bg-bg-deep px-4 py-3.5">
            <span className="text-[13px] text-muted-foreground">
              Need the full guide for {active.name}?
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              nativeButton={false}
              // biome-ignore lint/a11y/useAnchorContent: Base UI injects children into this render anchor.
              render={
                <a href="https://agentstate.app/agents.md" target="_blank" rel="noreferrer" />
              }
            >
              agents.md
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-1" />

      {/* Coding-agent system prompt */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="as-label text-[10.5px]">For coding agents</span>
          <h2 className="font-display text-[17px] font-semibold text-foreground">
            Hand this to your coding agent
          </h2>
        </div>

        <Card className="overflow-hidden py-0">
          <div className="flex items-center justify-between border-b border-line-soft bg-background px-4 py-2.5">
            <span className="font-mono text-[11px] text-muted-foreground">system-prompt.txt</span>
            <CopyButton text={INTEGRATION_PROMPT} />
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-foreground/80">
            {INTEGRATION_PROMPT}
          </pre>
        </Card>

        <div className="flex items-center gap-5 font-mono text-xs text-muted-foreground">
          <Link href="/docs" className="transition-colors hover:text-foreground">
            API reference
          </Link>
          <Link
            href="https://agentstate.app/agents.md"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            agents.md
          </Link>
        </div>
      </section>
    </div>
  );
}
