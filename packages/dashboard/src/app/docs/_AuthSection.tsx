import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const authHeader = "Authorization: Bearer <your-api-key>";
const createConversation = `curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Remember this session."}]}'`;

export function AuthSection() {
  return (
    <Card id="quick-start">
      <CardHeader>
        <CardTitle>Quick start</CardTitle>
        <CardDescription>
          Use a project API key as a Bearer token. API responses use snake_case fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
          <Badge variant="outline">Base URL</Badge>
          <code className="truncate font-mono text-sm text-foreground/80">
            https://agentstate.app/api
          </code>
          <CopyButton text="https://agentstate.app/api" />
        </div>
        <div className="grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
          <Badge variant="outline">Header</Badge>
          <code className="truncate font-mono text-sm text-foreground/80">{authHeader}</code>
          <CopyButton text={authHeader} />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Create a conversation
            </span>
            <CopyButton text={createConversation} />
          </div>
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground/80">
            {createConversation}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
