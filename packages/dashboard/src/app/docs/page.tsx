import {
  ArrowRightIcon,
  BookOpenIcon,
  DatabaseIcon,
  KeyRoundIcon,
  MessageSquareTextIcon,
  RouteIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
} from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AuthSection } from "./_AuthSection";
import { DocsFooter } from "./_DocsFooter";
import { DocsHeader } from "./_DocsHeader";
import { EndpointsTable } from "./_EndpointsTable";
import { MessageFormatSection } from "./_MessageFormatSection";

const docNav = [
  ["Quick start", "#quick-start"],
  ["Message format", "#message-format"],
  ["Endpoints", "#endpoints"],
] as const;

const overviewCards = [
  {
    title: "Bearer auth",
    description: "API keys are project-scoped and passed on every request.",
    icon: KeyRoundIcon,
  },
  {
    title: "Conversation store",
    description: "Persist agent messages, metadata, and external IDs at the edge.",
    icon: DatabaseIcon,
  },
  {
    title: "Retrieval API",
    description: "List, fetch, search, export, and append without rebuilding memory plumbing.",
    icon: RouteIcon,
  },
];

const workflowCards = [
  {
    title: "Send",
    description: "Create or append messages from your agent runtime.",
    icon: MessageSquareTextIcon,
  },
  {
    title: "Store",
    description: "Keep conversation state keyed by AgentState IDs or your external IDs.",
    icon: DatabaseIcon,
  },
  {
    title: "Retrieve",
    description: "Fetch full history before the next agent turn.",
    icon: RouteIcon,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DocsHeader />

      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 grid gap-4">
              <div className="grid gap-2">
                <Badge variant="outline">REST API</Badge>
                <Badge variant="secondary">Bearer token</Badge>
              </div>
              <Separator />
              <nav aria-label="Docs sections" className="grid gap-1">
                {docNav.map(([label, href]) => (
                  <Link
                    className="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <div className="grid gap-6">
            <section className="grid gap-5">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <ShieldCheckIcon data-icon="inline-start" />
                    Authenticated
                  </Badge>
                  <Badge variant="outline">
                    <TerminalSquareIcon data-icon="inline-start" />
                    JSON over HTTPS
                  </Badge>
                </div>
                <div className="grid gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                    AgentState API Reference
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                    Store, retrieve, and audit AI agent conversation history through a compact REST
                    API designed for production runtimes.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button nativeButton={false} render={<Link href="/dashboard" />}>
                  Open dashboard
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
                <Button
                  nativeButton={false}
                  // biome-ignore lint/a11y/useAnchorContent: Base UI injects the Button children into this render anchor.
                  render={<a href="/agents.md" />}
                  variant="outline"
                >
                  agents.md
                  <BookOpenIcon data-icon="inline-end" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {overviewCards.map(({ title, description, icon: Icon }) => (
                  <Card key={title} size="sm">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                        <CardTitle>{title}</CardTitle>
                      </div>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Runtime contract</CardTitle>
                <CardDescription>
                  The stable path is `/api/v1/*`; every protected route uses the same API-key
                  authorization model.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Base", "https://agentstate.app/api"],
                  ["Content", "application/json"],
                  ["Errors", "{ error: { code, message } }"],
                ].map(([label, value]) => (
                  <div className="grid gap-1 rounded-lg border border-border p-3" key={label}>
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {label}
                    </span>
                    <code className="break-all font-mono text-xs text-foreground/80">{value}</code>
                  </div>
                ))}
              </CardContent>
            </Card>

            <AuthSection />
            <MessageFormatSection />
            <EndpointsTable />
            <Card>
              <CardHeader>
                <CardTitle>Core workflow</CardTitle>
                <CardDescription>
                  The storage loop is intentionally small: send messages, persist state, retrieve
                  context.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {workflowCards.map(({ title, description, icon: Icon }) => (
                  <div className="grid gap-2 rounded-lg border border-border p-4" key={title}>
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <DocsFooter />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
