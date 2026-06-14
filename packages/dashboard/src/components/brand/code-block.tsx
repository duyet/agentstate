"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Lightweight monochrome highlighter — escapes HTML first, then wraps strings,
// HTTP verbs and a few keywords. Output is injected as HTML, so escaping the
// angle brackets / ampersands up front is what keeps it safe.
function highlight(line: string): string {
  const t = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trimmed = t.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return `<span style="color:var(--faint)">${t}</span>`;
  }
  return t
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span style="color:var(--brand-ink)">$1</span>')
    .replace(
      /\b(POST|GET|PATCH|PUT|DELETE)\b/g,
      '<span style="color:var(--brand-ink);font-weight:600">$1</span>',
    )
    .replace(
      /\b(const|await|async|function|return|import|from|export|new|let)\b/g,
      '<span style="color:var(--chart-3)">$1</span>',
    );
}

export function CodeBlock({
  code,
  title,
  copyable = true,
  dense = false,
  className,
}: {
  code: string;
  title?: string;
  copyable?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className={cn("overflow-hidden rounded-[9px] border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-line-soft bg-background px-3 py-2">
        <span className="as-label text-[10.5px]">{title || "code"}</span>
        {copyable && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={12} className="text-brand" /> : <Copy size={12} />}
            <span className="font-mono text-[11px]">{copied ? "copied" : "copy"}</span>
          </button>
        )}
      </div>
      <pre
        className={cn(
          "overflow-x-auto font-mono text-ink-2",
          dense ? "px-3.5 py-3 text-[12px]" : "p-4 text-[12.5px]",
        )}
        style={{ lineHeight: 1.7 }}
      >
        {lines.map((line, i) => (
          <div key={`${i}-${line}`} className="flex gap-3.5">
            <span className="w-4 flex-shrink-0 select-none text-right text-faint">{i + 1}</span>
            <code
              className="whitespace-pre"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: input is HTML-escaped in highlight() before tokens are wrapped
              dangerouslySetInnerHTML={{ __html: highlight(line) || "&nbsp;" }}
            />
          </div>
        ))}
      </pre>
    </div>
  );
}
