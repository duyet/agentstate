import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TopbarAuth } from "@/components/topbar-auth";
import { Button } from "@/components/ui/button";

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 px-6 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            nativeButton={false}
            render={<Link href="/" aria-label="Back to homepage" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
          </Button>
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
            className="hidden min-h-10 items-center text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
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
