import { ArrowLeftIcon, DatabaseIcon, Globe2Icon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <header className="mb-5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            className="mt-0.5 bg-muted"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <ArrowLeftIcon aria-hidden="true" />
            <span className="sr-only">Back to projects</span>
          </Button>
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
            <DatabaseIcon className="size-3.5" aria-hidden="true" />
            <span className="font-mono">durable conversation history</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2">
            <Globe2Icon className="size-3.5" aria-hidden="true" />
            <span className="truncate font-mono">https://agentstate.app/api</span>
          </div>
        </div>
      </div>
    </header>
  );
}
