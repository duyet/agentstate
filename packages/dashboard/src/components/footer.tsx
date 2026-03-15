"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-5">
      <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>AgentState</span>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/duyet/agentstate"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
