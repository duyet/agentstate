import { ArrowUpRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { FRAMEWORKS, type FrameworkId, FwGlyph } from "@/components/brand/frameworks";
import { CopyButton } from "@/components/copy-button";
import { CodeBlock } from "@/components/dashboard/integrate/code-block";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGENTS_MD_URL, API_BASE_URL, MCP_URL } from "@/lib/site";
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
curl -X POST ${API_BASE_URL}/v1/conversations \\
  -H "Authorization: Bearer as_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Hi"}]}'

# retrieve it later
curl ${API_BASE_URL}/v1/conversations/:id \\
  -H "Authorization: Bearer as_live_..."`,
};

const MCP_REMOTE_URL = MCP_URL;

// Token mode — paste an API key (or capability token); no browser sign-in needed.
const MCP_TOKEN_CONFIG = `{
  "mcpServers": {
    "agentstate": {
      "type": "http",
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer as_live_..." }
    }
  }
}`;

// OAuth mode — the client runs the consent flow; no key in config.
const MCP_OAUTH_CONFIG = `{
  "mcpServers": {
    "agentstate": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

const INTEGRATION_PROMPT = `Integrate AgentState into this project for persistent conversation storage.

Read the full integration guide and implement it:
${AGENTS_MD_URL}

API Base: ${API_BASE_URL}
Auth: Bearer token in Authorization header (key starts with as_live_)

After reading agents.md, store all conversation turns via the API so history persists across sessions.`;

export default function IntegrateContent() {
  const [fw, setFw] = useState<FrameworkId>("vercel");
  const active = FRAMEWORKS.find((f) => f.id === fw) ?? FRAMEWORKS[0];
  const isCurl = fw === "rest";

  return (
    <div className="page-wrap">
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
                  "flex items-center gap-[11px] rounded-[var(--radius)] border px-3 py-[11px] text-left transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96]",
                  selected
                    ? "border-fg bg-panel"
                    : "border-edge bg-panel hover:border-fg/20 hover:bg-panel2",
                )}
              >
                <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-edge bg-panel2">
                  <FwGlyph kind={f.glyph} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-fg">{f.name}</span>
                  <span className="block font-mono text-[10.5px] text-fg-3">{f.tag}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Active framework detail */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5 rounded-[var(--radius)] border border-edge bg-panel p-[18px]">
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2">
              <FwGlyph kind={active.glyph} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-semibold text-fg">{active.name}</div>
              <div className="as-mono mt-0.5 text-[12px] text-fg-3">
                {isCurl ? "no SDK required · raw REST" : "npm i @agentstate/sdk"}
              </div>
            </div>
            <Badge tone="live" dot>
              ready
            </Badge>
          </div>

          <CodeBlock code={ADAPTER_SNIPPETS[fw]} title={isCurl ? "terminal" : `${active.tag}.ts`} />

          <div className="flex items-center justify-between rounded-[var(--radius)] border border-edge bg-panel2 px-4 py-3.5">
            <span className="text-[13px] text-fg-3">Need the full guide for {active.name}?</span>
            <a href={AGENTS_MD_URL} target="_blank" rel="noreferrer">
              <Button variant="ghost" className="min-h-0 px-2.5 py-1 text-fg-3">
                agents.md
                <ArrowUpRightIcon aria-hidden="true" />
              </Button>
            </a>
          </div>
        </div>
      </div>

      <hr className="my-1 border-edge" />

      {/* Connect via MCP (remote server) */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="as-label text-[10.5px]">Model Context Protocol</span>
          <h2 className="text-[17px] font-semibold text-fg">Connect via MCP</h2>
          <p className="text-[13px] text-fg-3">
            Use AgentState from Claude, Cursor, and other MCP clients. Point the client at the
            hosted server and authenticate with a token, or let it run the OAuth consent flow.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-edge bg-panel2 px-4 py-3">
          <code className="as-mono truncate text-[12.5px] text-fg-2">{MCP_REMOTE_URL}</code>
          <CopyButton text={MCP_REMOTE_URL} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] text-fg-3">Token auth (paste an API key)</span>
            <CodeBlock code={MCP_TOKEN_CONFIG} title="mcp.json" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] text-fg-3">OAuth (browser consent)</span>
            <CodeBlock code={MCP_OAUTH_CONFIG} title="mcp.json" />
          </div>
        </div>

        <div className="flex items-center gap-5 font-mono text-xs text-fg-3">
          <Link href="/docs" className="transition-colors hover:text-fg">
            MCP &amp; permissions docs
          </Link>
        </div>
      </section>

      <hr className="my-1 border-edge" />

      {/* Coding-agent system prompt */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="as-label text-[10.5px]">For coding agents</span>
          <h2 className="text-[17px] font-semibold text-fg">Hand this to your coding agent</h2>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-edge bg-panel2 px-4 py-2.5">
            <span className="font-mono text-[11px] text-fg-3">system-prompt.txt</span>
            <CopyButton text={INTEGRATION_PROMPT} />
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-fg-2">
            {INTEGRATION_PROMPT}
          </pre>
        </Card>

        <div className="flex items-center gap-5 font-mono text-xs text-fg-3">
          <Link href="/docs" className="transition-colors hover:text-fg">
            API reference
          </Link>
          <Link
            href={AGENTS_MD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-fg"
          >
            agents.md
          </Link>
        </div>
      </section>
    </div>
  );
}
