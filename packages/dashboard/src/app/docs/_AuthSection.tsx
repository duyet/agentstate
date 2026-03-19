export function AuthSection() {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Authentication
      </h2>
      <p className="text-sm text-muted-foreground mb-3">Pass your API key in every request:</p>
      <pre className="font-mono text-xs text-foreground/80 bg-card border border-border rounded px-4 py-3">
        {`Authorization: Bearer <your-api-key>`}
      </pre>
      <p className="text-xs text-muted-foreground mt-3">
        Base URL: <code className="font-mono text-foreground/70">https://agentstate.app/api</code>
      </p>
    </section>
  );
}
