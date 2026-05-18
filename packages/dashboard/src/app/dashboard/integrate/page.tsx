import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INTEGRATION_PROMPT = `Integrate AgentState into this project for persistent conversation storage.

Read the full integration guide and implement it:
https://agentstate.app/agents.md

API Base: https://agentstate.app/api
Auth: Bearer token in Authorization header (key starts with as_live_)

After reading agents.md, store all conversation turns via the API so history persists across sessions.`;

export default function IntegratePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Integration"
        description="Pass this to your coding agent to implement AgentState in your project."
      />

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="font-mono text-xs text-muted-foreground">
            system-prompt.txt
          </CardTitle>
          <CopyButton text={INTEGRATION_PROMPT} />
        </CardHeader>
        <CardContent className="p-0">
          <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-foreground/80">
            {INTEGRATION_PROMPT}
          </pre>
        </CardContent>
      </Card>

      <div className="flex items-center gap-5 font-mono text-xs text-muted-foreground">
        <Link href="/docs" className="hover:text-foreground transition-colors">
          API reference
        </Link>
        <Link
          href="https://agentstate.app/agents.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          agents.md
        </Link>
      </div>
    </div>
  );
}
