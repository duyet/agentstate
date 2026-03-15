import { ArrowRightIcon, CpuIcon, DatabaseIcon, PlugIcon } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" fill="none" className="size-6 text-foreground">
              <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
              <g stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <line x1="9" y1="11" x2="19" y2="11" />
                <line x1="13" y1="16" x2="23" y2="16" />
                <line x1="9" y1="21" x2="17" y2="21" />
              </g>
              <circle cx="23" cy="21" r="2" fill="#22c55e" />
            </svg>
            <span className="font-mono text-sm font-semibold tracking-tight">AgentState</span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard/docs"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/duyet/agentstate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              GitHub
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="text-xs h-8 px-4">
                Dashboard
                <ArrowRightIcon className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-16">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4 leading-tight">
              Conversation history
              <br />
              <span className="text-muted-foreground">for AI agents</span>
            </h1>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-md">
              Store, retrieve, and manage multi-turn conversations with a simple REST API. Works
              with any framework. No SDK required.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button className="h-9 px-5 text-sm">
                  Get started
                  <ArrowRightIcon className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/dashboard/docs">
                <Button variant="outline" className="h-9 px-5 text-sm">
                  API Reference
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Code example */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <div className="flex gap-1.5" aria-hidden="true">
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground ml-2">terminal</span>
            </div>
            <pre className="p-5 text-xs font-mono leading-6 overflow-x-auto">
              <code>
                <span className="text-muted-foreground/50">$ </span>
                <span className="text-foreground">curl</span>
                <span className="text-muted-foreground">
                  {" "}
                  -X POST https://agentstate.app/api/v1/conversations \{"\n"}
                </span>
                <span className="text-muted-foreground">
                  {"    "}-H &quot;Authorization: Bearer as_live_...&quot; \{"\n"}
                </span>
                <span className="text-muted-foreground">
                  {"    "}-H &quot;Content-Type: application/json&quot; \{"\n"}
                </span>
                <span className="text-muted-foreground">
                  {"    "}-d {`'{"messages": [{"role": "user", "content": "Hello"}]}'`}
                  {"\n"}
                </span>
                {"\n"}
                <span className="text-muted-foreground/50">{`// → `}</span>
                <span className="text-green-600 dark:text-green-400/70">{`{"id": "aB3x...", "message_count": 1, "created_at": ...}`}</span>
              </code>
            </pre>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
                  <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium">Persistent storage</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full conversation threads with roles, content, metadata, and token counts.
                Cursor-based pagination for large histories.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
                  <CpuIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium">AI-powered</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Auto-generate conversation titles and follow-up question suggestions. Let your
                agents organize their own history.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
                  <PlugIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium">Any framework</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Works with Vercel AI SDK, LangGraph, Cloudflare Agents, or any HTTP client. Simple
                REST API, no vendor lock-in.
              </p>
            </div>
          </div>
        </section>

        {/* API endpoints */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <h2 className="text-sm font-medium mb-4">API endpoints</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs" aria-label="API endpoints">
              <tbody className="divide-y divide-border">
                {[
                  ["POST", "/api/v1/conversations", "Create conversation"],
                  ["GET", "/api/v1/conversations", "List conversations"],
                  ["GET", "/api/v1/conversations/:id", "Get with messages"],
                  ["POST", "/api/v1/conversations/:id/messages", "Append messages"],
                  ["POST", "/api/v1/conversations/:id/generate-title", "AI title"],
                  ["POST", "/api/v1/conversations/:id/follow-ups", "AI follow-ups"],
                  ["POST", "/api/v1/conversations/export", "Bulk export"],
                ].map(([method, path, desc]) => (
                  <tr key={path + method} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-muted-foreground w-16">{method}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{path}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-4">
            <Link
              href="/dashboard/docs"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Full API reference &rarr;
            </Link>
            <Link
              href="/agents.md"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              agents.md &rarr;
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
