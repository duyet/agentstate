import { DatabaseIcon, type LucideIcon, SearchIcon, SendIcon } from "lucide-react";
import {
  landingCard,
  landingContainer,
  landingHover,
  landingItem,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { StateArchitectureDiagram } from "@/components/landing/visuals";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Step = {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  endpoint: string;
  icon: LucideIcon;
};

const steps: readonly Step[] = [
  {
    number: 1,
    title: "Send runtime context",
    description: "Your agent writes messages with metadata and project ownership.",
    endpoint: "POST /api/v1/conversations",
    icon: SendIcon,
  },
  {
    number: 2,
    title: "Store durable history",
    description: "AgentState persists the thread, token counts, timestamps, and tags.",
    endpoint: "D1 + Drizzle",
    icon: DatabaseIcon,
  },
  {
    number: 3,
    title: "Retrieve when needed",
    description: "Fetch exact history for resumes, audit views, analytics, or exports.",
    endpoint: "GET /api/v1/conversations/:id",
    icon: SearchIcon,
  },
] as const;

export function HowItWorks() {
  return (
    <MotionSection
      className="max-w-5xl mx-auto px-6 pb-20"
      animate="visible"
      initial="hidden"
      variants={landingContainer}
    >
      <div className="flex flex-col gap-6">
        <MotionDiv className="flex flex-col gap-2" variants={landingItem}>
          <h2 className="text-lg font-medium">How it works</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The workflow stays explicit: write context, persist state, read it back when the agent
            needs continuity.
          </p>
        </MotionDiv>
        <MotionDiv variants={landingCard} whileHover={landingHover}>
          <Card>
            <CardHeader>
              <CardTitle>Where AgentState fits</CardTitle>
              <CardDescription>
                Keep your agent SDK for orchestration. AgentState owns durable conversation state,
                retrieval, analytics, and audit history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="landing-svg-frame">
                <StateArchitectureDiagram />
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
        <MotionDiv className="grid gap-4 sm:grid-cols-3" variants={landingContainer}>
          {steps.map(({ number, title, description, endpoint, icon: Icon }) => (
            <MotionDiv key={number} variants={landingCard} whileHover={landingHover}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon aria-hidden="true" />
                    </span>
                    {title}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="outline">Step {number}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                  <code className="truncate rounded-md bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
                    {endpoint}
                  </code>
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
