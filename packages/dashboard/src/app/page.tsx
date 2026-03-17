import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { AnimatedFeatureIcon } from "@/components/landing/animated-feature-icon";
import { HeroIllustration } from "@/components/landing/hero-illustration";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" fill="none" className="size-6 text-foreground">
              <title>AgentState logo</title>
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/duyet/agentstate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              GitHub
            </Link>
            <Button size="sm" className="text-sm h-8 px-4" render={<Link href="/dashboard" />}>
              Dashboard
              <ArrowRightIcon className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative max-w-5xl mx-auto px-6 pt-28 pb-20">
          <HeroIllustration />
          <div className="relative max-w-2xl animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-5 leading-[1.1]">
              Conversation history
              <br />
              <span className="text-muted-foreground">for AI agents</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Store, retrieve, and manage multi-turn conversations with a simple REST API. Works
              with any framework. No SDK required.
            </p>
            <div className="flex items-center gap-3">
              <Button className="h-10 px-6 text-sm" render={<Link href="/dashboard" />}>
                Get started
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-10 px-6 text-base"
                render={<Link href="/dashboard/docs" />}
              >
                API Reference
              </Button>
            </div>
          </div>
        </section>

        {/* Code example */}
        <section
          className="max-w-5xl mx-auto px-6 pb-24 animate-fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <div className="flex gap-1.5" aria-hidden="true">
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground ml-2">terminal</span>
            </div>
            <pre className="p-5 text-xs sm:text-sm font-mono leading-6 overflow-x-auto">
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

        {/* How it works */}
        <HowItWorks />

        {/* Features */}
        <section
          className="max-w-5xl mx-auto px-6 pb-28 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AnimatedFeatureIcon variant="database" />
                <h2 className="text-base sm:text-lg font-medium">Persistent storage</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Full conversation threads with roles, content, metadata, and token counts.
                Cursor-based pagination for large histories.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AnimatedFeatureIcon variant="cpu" />
                <h2 className="text-base sm:text-lg font-medium">AI-powered</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Auto-generate conversation titles and follow-up question suggestions. Let your
                agents organize their own history.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AnimatedFeatureIcon variant="plug" />
                <h2 className="text-base sm:text-lg font-medium">Any framework</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Works with Vercel AI SDK, LangGraph, Cloudflare Agents, or any HTTP client. Simple
                REST API, no vendor lock-in.
              </p>
            </div>
          </div>
        </section>

        {/* API endpoints */}
        <section
          className="max-w-5xl mx-auto px-6 pb-28 animate-fade-in-up"
          style={{ animationDelay: "0.45s" }}
        >
          <h2 className="text-lg font-medium mb-5">API endpoints</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm" aria-label="API endpoints">
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
                    <td className="px-4 py-3 font-mono text-muted-foreground w-16">{method}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{path}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex gap-5">
            <Link
              href="/dashboard/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Full API reference &rarr;
            </Link>
            <Link
              href="/agents.md"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
