export function MessageFormatSection() {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Message Format
      </h2>
      <pre className="font-mono text-xs text-foreground/80 bg-card border border-border rounded px-4 py-3 overflow-x-auto">
        {`{
  "role": "user | assistant | system | tool",
  "content": "message text",
  "metadata": {}
}`}
      </pre>
    </section>
  );
}
