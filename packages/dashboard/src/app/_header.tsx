import Image from "next/image";
import Link from "next/link";
import { MotionHeader } from "@/components/landing/motion";
import { TopbarAuth } from "@/components/topbar-auth";

export function Header() {
  return (
    <MotionHeader
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 border-b border-border bg-card/80 px-6 py-3 backdrop-blur-sm"
      initial={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
    >
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
          <TopbarAuth />
        </div>
      </div>
    </MotionHeader>
  );
}
