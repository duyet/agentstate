"use client";

import { ArrowLeft, Database, Globe } from "@phosphor-icons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <header className="overflow-hidden rounded-[var(--radius-lg)] border border-edge bg-panel">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to projects"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge text-fg-3 transition-[background-color,color] hover:bg-panel2 hover:text-fg"
          >
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Project</Badge>
              <span className="num font-mono text-xs text-fg-4">{slug}</span>
            </div>
            <h1 className="truncate text-[26px] font-semibold tracking-tight text-fg">{name}</h1>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-fg-3 sm:min-w-64">
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-edge bg-panel2 px-2.5 py-2">
            <Database className="size-3.5" aria-hidden />
            <span className="num font-mono">durable conversation history</span>
          </div>
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-edge bg-panel2 px-2.5 py-2">
            <Globe className="size-3.5" aria-hidden />
            <span className="num truncate font-mono">https://agentstate.app/api</span>
          </div>
        </div>
      </div>
    </header>
  );
}
