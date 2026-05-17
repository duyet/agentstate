import {
  landingCard,
  landingContainer,
  landingHover,
  landingItem,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const examples = [
  {
    label: "Agent prompt",
    title: "Give your coding agent the API contract",
    description: "Use the public agent docs when you want the integration wired by another agent.",
    code: `Use AgentState to store conversation history for my chatbot.

API docs: agentstate.app/agents.md
API key: as_live_...`,
  },
  {
    label: "HTTP",
    title: "Call the REST API directly",
    description: "Use plain HTTP from any runtime, framework, or job runner.",
    code: `curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer as_live_..." \\
  -d '{"messages":[{"role":"user","content":"Hello"}]}'`,
  },
] as const;

export function CodeExamples() {
  return (
    <MotionSection
      className="max-w-5xl mx-auto px-6 pb-20"
      animate="visible"
      initial="hidden"
      variants={landingContainer}
    >
      <div className="flex flex-col gap-6">
        <MotionDiv className="flex flex-col gap-2" variants={landingItem}>
          <h2 className="text-lg font-medium">Integration paths</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Start with agent-readable docs or a direct API call. Both paths hit the same storage
            contract.
          </p>
        </MotionDiv>
        <MotionDiv className="grid gap-4 sm:grid-cols-2" variants={landingContainer}>
          {examples.map((example) => (
            <MotionDiv
              className="min-w-0"
              key={example.label}
              variants={landingCard}
              whileHover={landingHover}
            >
              <Card className="min-w-0" size="sm">
                <CardHeader>
                  <CardTitle>{example.title}</CardTitle>
                  <CardDescription className="flex flex-col gap-2">
                    <Badge variant="outline">{example.label}</Badge>
                    <span>{example.description}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-sm leading-6 text-muted-foreground">
                    <code>{example.code}</code>
                  </pre>
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
