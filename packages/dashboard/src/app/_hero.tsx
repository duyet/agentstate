import {
  ArrowRightIcon,
  DatabaseIcon,
  HistoryIcon,
  KeyRoundIcon,
  MessageSquareIcon,
} from "lucide-react";
import Link from "next/link";
import {
  landingCard,
  landingContainer,
  landingHover,
  landingItem,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const overviewRows = [
  { label: "Ingest", value: "POST /api/v1/conversations" },
  { label: "Retrieve", value: "GET /api/v1/conversations/:id" },
  { label: "Analyze", value: "GET /api/v1/analytics/summary" },
] as const;

const productSignals = [
  { icon: MessageSquareIcon, label: "Conversation threads" },
  { icon: DatabaseIcon, label: "D1-backed storage" },
  { icon: HistoryIcon, label: "Cursor history" },
  { icon: KeyRoundIcon, label: "Hashed API keys" },
] as const;

export function Hero() {
  return (
    <MotionSection
      animate="visible"
      className="max-w-5xl mx-auto px-6 py-16 sm:py-20"
      initial="hidden"
      variants={landingContainer}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <MotionDiv className="flex flex-wrap gap-2" variants={landingItem}>
            <Badge variant="outline">REST API</Badge>
            <Badge variant="outline">Cloudflare D1</Badge>
            <Badge variant="outline">Agent memory</Badge>
          </MotionDiv>
          <MotionDiv className="flex flex-col gap-4" variants={landingItem}>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              AgentState
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Conversation history database-as-a-service for AI agents. Store threads, retrieve
              context, monitor usage, and ship without building another chat-history backend.
            </p>
          </MotionDiv>
          <MotionDiv className="flex flex-wrap items-center gap-3" variants={landingItem}>
            <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
              Open dashboard
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<a href="/agents.md">agents.md</a>}
            />
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/docs" />}>
              API reference
            </Button>
          </MotionDiv>
          <MotionDiv className="grid gap-3 sm:grid-cols-2" variants={landingContainer}>
            {productSignals.map(({ icon: Icon, label }) => (
              <MotionDiv key={label} variants={landingCard} whileHover={landingHover}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon aria-hidden="true" />
                      </span>
                      {label}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </MotionDiv>
            ))}
          </MotionDiv>
        </div>

        <MotionDiv variants={landingCard} whileHover={landingHover}>
          <Card>
            <CardHeader>
              <CardTitle>Operations overview</CardTitle>
              <CardDescription>
                One API surface for runtime memory and audit history.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">Live</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {overviewRows.map((row) => (
                <div key={row.value} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{row.label}</span>
                    <Badge variant="outline">v1</Badge>
                  </div>
                  <code className="truncate rounded-md bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
                    {row.value}
                  </code>
                </div>
              ))}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-semibold">21</span>
                  <span className="text-sm text-muted-foreground">char IDs</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-semibold">SHA-256</span>
                  <span className="text-sm text-muted-foreground">key hashes</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Built for agents that need stable memory across deploys, sessions, and frameworks.
              </p>
            </CardFooter>
          </Card>
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
