import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-3 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" fill="none" className="size-6 text-foreground">
            <title>AgentState logo</title>
            <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
            <g stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <line x1="9" y1="11" x2="19" y2="11" />
              <line x1="13" y1="16" x2="23" y2="16" />
              <line x1="9" y1="21" x2="17" y2="21" />
            </g>
            <circle cx="23" cy="21" r="2" fill="#22c55e" />
          </svg>
          <span className="font-mono text-sm font-semibold tracking-tight">AgentState</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Docs
          </Link>
          <Link
            href="https://github.com/duyet/agentstate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            GitHub
          </Link>
          <Button size="sm" render={<Link href="/dashboard" />}>
            Dashboard
            <ArrowRightIcon className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </header>
  );
}
