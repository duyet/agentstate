"use client";

import { ArrowLeft, Database, Globe } from "@phosphor-icons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/site";

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <header className="overflow-hidden rounded-[var(--radius-lg)] border border-edge bg-panel">
      <div className="flex flex-col gap-component card-padding-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to projects"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge text-fg-3 transition-[background-color,color] hover:bg-panel2 hover:text-fg"
          >
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <div className="min-w-0 space-y-tight">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Project</Badge>
              <span className="num font-mono text-xs text-fg-4">{slug}</span>
            </div>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {name}
            </h1>
          </div>
        </div>
        <div className="grid gap-tight text-xs text-fg-3 sm:min-w-64">
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-edge bg-panel2 px-2.5 py-2">
            <Database className="size-3.5" aria-hidden />
            <span className="num font-mono">durable conversation history</span>
          </div>
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-edge bg-panel2 px-2.5 py-2">
            <Globe className="size-3.5" aria-hidden />
            <span className="num truncate font-mono">{API_BASE_URL}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
