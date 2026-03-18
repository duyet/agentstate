export function _QuickStartCode() {
  return (
    <div>
      <h3 className="font-medium mb-3">Quick start</h3>
      <pre className="font-mono text-sm bg-card border border-border rounded-lg p-5 overflow-x-auto text-muted-foreground leading-relaxed">
        {`curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`}
      </pre>
    </div>
  );
}
