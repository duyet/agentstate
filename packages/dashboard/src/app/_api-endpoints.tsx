import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { MethodTag } from "@/components/brand/bits";
import { Button } from "@/components/ui/button";
import { Section } from "./_section";

const ENDPOINTS: [method: string, path: string, desc: string][] = [
  ["POST", "/api/v1/conversations", "Create conversation or state"],
  ["GET", "/api/v1/conversations", "List with total count"],
  ["GET", "/api/v1/conversations/:id", "Get, include=messages"],
  ["POST", "/api/v1/conversations/:id/messages", "Append messages"],
  ["POST", "/api/v1/conversations/:id/generate-title", "AI title"],
  ["GET", "/api/v1/analytics/summary", "Usage summary"],
  ["GET", "/api/v1/conversations/search", "Full-text search"],
];

export function ApiSurface() {
  return (
    <Section>
      <div className="overflow-hidden rounded-[9px] border border-border bg-card shadow-sm">
        <div className="border-b border-line-soft px-[22px] py-5">
          <h3 className="text-[19px]">API surface</h3>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Small enough for agents and humans to keep in context.
          </p>
        </div>
        <div>
          {ENDPOINTS.map(([method, path, desc], i) => (
            <div
              key={path + method}
              className="grid grid-cols-[64px_1fr] items-center gap-4 px-[22px] py-3 sm:grid-cols-[76px_1fr_auto]"
              style={{
                borderBottom: i < ENDPOINTS.length - 1 ? "1px solid var(--line-soft)" : undefined,
              }}
            >
              <MethodTag>{method}</MethodTag>
              <span className="truncate font-mono text-[13px] text-foreground">{path}</span>
              <span className="hidden text-[13px] text-muted-foreground sm:block">{desc}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 bg-background px-[22px] py-3.5">
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/docs" />}>
            Full API reference
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            nativeButton={false}
            // biome-ignore lint/a11y/useAnchorContent: Base UI injects children into this render anchor.
            render={<a href="/agents.md" target="_blank" rel="noreferrer" />}
          >
            agents.md
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </Section>
  );
}
