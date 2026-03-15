import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            AgentState
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/duyet/agentstate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="font-mono text-xs">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20">
        <p className="text-xs font-mono text-muted-foreground mb-4 tracking-widest uppercase">
          agentstate.app
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
          Conversation history for AI agents
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-lg">
          A simple REST API to store, retrieve, and manage multi-turn
          conversation history. No SDK required.
        </p>

        <div className="flex items-center gap-3 mb-16">
          <Link href="/dashboard">
            <Button size="sm" className="font-mono text-xs">
              Open Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/docs">
            <Button size="sm" variant="ghost" className="font-mono text-xs text-muted-foreground">
              API Reference
            </Button>
          </Link>
        </div>

        <div className="mb-16">
          <pre className="font-mono text-xs leading-6 text-muted-foreground bg-card border border-border rounded p-5 overflow-x-auto">
            <span className="text-foreground/40"># store a message</span>{"\n"}
            <span className="text-foreground">curl</span>{" "}
            <span className="text-muted-foreground">-X POST https://agentstate.app/api/v1/conversations \</span>{"\n"}
            {"  "}<span className="text-muted-foreground">{`-H "Authorization: Bearer <token>" \\`}</span>{"\n"}
            {"  "}<span className="text-muted-foreground">{`-H "Content-Type: application/json" \\`}</span>{"\n"}
            {"  "}<span className="text-muted-foreground">{`-d '{"messages": [{"role": "user", "content": "Hello"}]}'`}</span>{"\n"}
            {"\n"}
            <span className="text-foreground/40"># response</span>{"\n"}
            <span className="text-green-500/70">{`{"id": "conv_01jx...", "title": "New Conversation", "created_at": "..."}`}</span>
          </pre>
        </div>

        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="font-mono text-xs text-foreground/30 mt-0.5 w-4 shrink-0">—</span>
            <span>Persist full conversation threads with roles, content, and arbitrary metadata</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-mono text-xs text-foreground/30 mt-0.5 w-4 shrink-0">—</span>
            <span>Works with Claude, OpenAI, LangChain, AutoGen, or any custom agent</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-mono text-xs text-foreground/30 mt-0.5 w-4 shrink-0">—</span>
            <span>AI-generated titles and follow-up suggestions built in</span>
          </li>
        </ul>
      </main>

      <footer className="border-t border-border px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>AgentState</span>
          <Link
            href="https://github.com/duyet/agentstate"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
        </div>
      </footer>
    </div>
  );
}
