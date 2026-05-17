import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TopbarAuth } from "@/components/topbar-auth";

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 px-6 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            aria-label="Back to homepage"
            className="text-muted-foreground transition-colors hover:text-foreground"
            href="/"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <Image
            aria-hidden="true"
            alt=""
            className="size-6"
            height={24}
            src="/logo.svg"
            width={24}
          />
          <span className="font-mono text-sm font-semibold tracking-tight">AgentState Docs</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            href="https://github.com/duyet/agentstate"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </Link>
          <TopbarAuth />
        </div>
      </div>
    </header>
  );
}
