export function _QuickStartCode() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">Quick start</h3>
      <pre className="overflow-x-auto rounded-xl bg-card p-5 font-mono text-sm leading-relaxed text-muted-foreground ring-1 ring-foreground/10">
        {`curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`}
      </pre>
    </div>
  );
}
