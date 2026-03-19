import Link from "next/link";

export function DocsFooter() {
  return (
    <div className="border-t border-border pt-6 text-xs text-muted-foreground font-mono">
      Machine-readable:{" "}
      <Link
        href="https://agentstate.app/agents.md"
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground/60 hover:text-foreground transition-colors"
      >
        agents.md
      </Link>
    </div>
  );
}
