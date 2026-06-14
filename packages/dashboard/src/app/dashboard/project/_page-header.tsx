"use client";

import { Badge } from "@cloudflare/kumo/components/badge";
import { buttonVariants } from "@cloudflare/kumo/components/button";
import { ArrowLeft, Database, Globe } from "@phosphor-icons/react";
import Link from "next/link";

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <header className="mb-5 overflow-hidden rounded-lg border border-border bg-kumo-base shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to projects"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              shape: "square",
            })}
          >
            <ArrowLeft aria-hidden />
          </Link>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Project</Badge>
              <span className="font-mono text-xs text-muted-foreground">{slug}</span>
            </div>
            <h1 className="truncate text-[26px] font-semibold tracking-tight text-foreground">
              {name}
            </h1>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:min-w-64">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2">
            <Database className="size-3.5" aria-hidden />
            <span className="font-mono">durable conversation history</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2">
            <Globe className="size-3.5" aria-hidden />
            <span className="truncate font-mono">https://agentstate.app/api</span>
          </div>
        </div>
      </div>
    </header>
  );
}
