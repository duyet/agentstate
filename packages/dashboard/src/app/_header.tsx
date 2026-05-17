import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 px-6 py-3 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
            aria-hidden="true"
          />
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
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
            Dashboard
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </header>
  );
}
