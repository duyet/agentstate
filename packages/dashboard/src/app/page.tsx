import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/40 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-mono font-semibold text-base tracking-tight">
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
                Dashboard →
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="mb-6 flex justify-center">
            <Badge
              variant="outline"
              className="font-mono text-xs px-3 py-1 text-muted-foreground border-border/60"
            >
              DB-as-a-service for AI agents
            </Badge>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 text-foreground">
            AgentState
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Conversation history for AI agents.
            <br />
            Store, retrieve, and manage multi-turn conversations across any
            framework.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="font-mono text-sm px-6">
                Open Dashboard →
              </Button>
            </Link>
            <Link href="/dashboard/docs">
              <Button
                size="lg"
                variant="ghost"
                className="font-mono text-sm px-6 text-muted-foreground"
              >
                Read Docs
              </Button>
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/40 bg-card p-6">
              <div className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-3">
                01
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Store Conversations
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Persist full conversation threads with roles, content, and
                custom metadata. Built for multi-turn agent interactions.
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-card p-6">
              <div className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-3">
                02
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                AI-Powered
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Auto-generate conversation titles and follow-up suggestions.
                Let your agents organize their own history intelligently.
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-card p-6">
              <div className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-3">
                03
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Any Framework
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Works with Claude, OpenAI, LangChain, AutoGen, or any custom
                agent. Simple REST API, no SDK required.
              </p>
            </div>
          </div>
        </section>

        {/* Code Example */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
            <div className="border-b border-border/40 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
              <span className="ml-2 text-xs font-mono text-muted-foreground">
                terminal
              </span>
            </div>
            <div className="p-6 font-mono text-sm leading-loose overflow-x-auto">
              <p className="text-muted-foreground mb-1">
                # Create a conversation
              </p>
              <p>
                <span className="text-muted-foreground">$ </span>
                <span className="text-foreground">
                  curl -X POST https://agentstate.app/api/v1/conversations \
                </span>
              </p>
              <p className="pl-4 text-foreground">
                {`  -H "Authorization: Bearer <token>" \\`}
              </p>
              <p className="pl-4 text-foreground">
                {`  -H "Content-Type: application/json" \\`}
              </p>
              <p className="pl-4 text-foreground">
                {`  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`}
              </p>
              <p className="mt-4 text-muted-foreground"># Response</p>
              <p className="text-green-400/80">
                {`{"id": "conv_01jx...", "title": "New Conversation", ...}`}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-mono">AgentState</span>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/docs"
              className="hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/duyet/agentstate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
