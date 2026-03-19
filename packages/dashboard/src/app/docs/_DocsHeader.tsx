import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export function DocsHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-3 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <span className="font-mono text-sm font-semibold tracking-tight">API Reference</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="https://github.com/duyet/agentstate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}
