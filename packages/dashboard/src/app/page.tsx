import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { AnimatedFeatureIcon } from "@/components/landing/animated-feature-icon";
import { HeroIllustration } from "@/components/landing/hero-illustration";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

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
              href="/docs"
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
            <Button size="sm" render={<Link href="/dashboard" />}>
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
            <p className="text-lg sm:text-xl text-muted-foreground mb-4 leading-relaxed max-w-lg">
              You&apos;re building AI agents — not a conversation database. Stop reinventing
              storage, analytics, and history management. Just call an API.
            </p>
            <p className="text-sm text-muted-foreground/70 mb-10 leading-relaxed max-w-lg">
              Built for vibe coders. No SDK needed — give your coding agent the API docs and let it
              wire things up. Works with any framework, any language.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="/dashboard" />}>
                Get started
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" render={<Link href="/agents.md" />}>
                agents.md
              </Button>
              <Button variant="outline" size="lg" render={<Link href="/docs" />}>
                API Reference
              </Button>
            </div>
          </div>
        </section>

        {/* Code examples */}
        <section
          className="max-w-5xl mx-auto px-6 pb-24 animate-fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Vibe coder approach */}
            <Card size="sm" className="border-border/50">
              <CardHeader className="border-b border-border/50 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  </div>
                  <CardTitle className="text-[10px] font-mono text-muted-foreground">
                    tell your coding agent
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <pre className="text-xs sm:text-sm font-mono leading-6 overflow-x-auto">
                  <code>
                    <span className="text-muted-foreground/70">
                      {`Use AgentState to store conversation\nhistory for my chatbot.\n\n`}
                    </span>
                    <span className="text-muted-foreground/70">{`API docs: `}</span>
                    <span className="text-green-600 dark:text-green-400/70">
                      {`agentstate.app/agents.md`}
                    </span>
                    <span className="text-muted-foreground/70">{`\nAPI key: `}</span>
                    <span className="text-foreground/60">{`as_live_...`}</span>
                  </code>
                </pre>
              </CardContent>
            </Card>

            {/* REST API approach */}
            <Card size="sm" className="border-border/50">
              <CardHeader className="border-b border-border/50 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  </div>
                  <CardTitle className="text-[10px] font-mono text-muted-foreground">
                    or use the REST API directly
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <pre className="text-xs sm:text-sm font-mono leading-6 overflow-x-auto">
                  <code>
                    <span className="text-muted-foreground/50">$ </span>
                    <span className="text-foreground">curl</span>
                    <span className="text-muted-foreground">
                      {" "}
                      -X POST .../v1/conversations \{"\n"}
                    </span>
                    <span className="text-muted-foreground">
                      {"  "}-H &quot;Authorization: Bearer ...&quot; \{"\n"}
                    </span>
                    <span className="text-muted-foreground">
                      {"  "}-d {`'{"messages": [...]}'`}
                      {"\n"}
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground/50">{`→ `}</span>
                    <span className="text-green-600 dark:text-green-400/70">
                      {`{"id": "aB3x...", "message_count": 1}`}
                    </span>
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <HowItWorks />

        {/* Features */}
        <section
          className="max-w-5xl mx-auto px-6 pb-28 space-y-8 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <h2 className="text-lg font-medium">Features</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AnimatedFeatureIcon variant="database" />
                  <span>Persistent storage</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Full conversation threads with roles, content, metadata, and token counts.
                  Cursor-based pagination for large histories.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AnimatedFeatureIcon variant="cpu" />
                  <span>AI-powered</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Auto-generate conversation titles and follow-up question suggestions. Let your
                  agents organize their own history.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AnimatedFeatureIcon variant="plug" />
                  <span>Any framework</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Works with Vercel AI SDK, LangGraph, Cloudflare Agents, or any HTTP client. Simple
                  REST API, no vendor lock-in.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use cases */}
        <UseCases />

        {/* API endpoints */}
        <section
          className="max-w-5xl mx-auto px-6 pb-28 space-y-6 animate-fade-in-up"
          style={{ animationDelay: "0.45s" }}
        >
          <h2 className="text-lg font-medium">API endpoints</h2>
          <Card>
            <Table>
              <TableBody>
                {[
                  ["POST", "/api/v1/conversations", "Create conversation"],
                  ["GET", "/api/v1/conversations", "List conversations"],
                  ["GET", "/api/v1/conversations/:id", "Get with messages"],
                  ["POST", "/api/v1/conversations/:id/messages", "Append messages"],
                  ["POST", "/api/v1/conversations/:id/generate-title", "AI title"],
                  ["POST", "/api/v1/conversations/:id/follow-ups", "AI follow-ups"],
                  ["POST", "/api/v1/conversations/export", "Bulk export"],
                ].map(([method, path, desc]) => (
                  <TableRow key={path + method}>
                    <TableCell className="font-mono text-muted-foreground w-16">{method}</TableCell>
                    <TableCell className="font-mono text-foreground">{path}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {desc}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="flex gap-5">
            <Link
              href="/docs"
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
