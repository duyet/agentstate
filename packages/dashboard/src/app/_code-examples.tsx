import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CodeExamples() {
  return (
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
                <span className="text-muted-foreground"> -X POST .../v1/conversations \{"\n"}</span>
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
  );
}
