"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCopiedText } from "@/lib/hooks/use-copied-text";
import { cn } from "@/lib/utils";

// Lightweight monochrome highlighter — escapes HTML first, then wraps strings,
// HTTP verbs and a few keywords. Output is injected as HTML, so escaping the
// angle brackets / ampersands up front is what keeps it safe.
function highlight(line: string): string {
  const t = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trimmed = t.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return `<span class="text-fg-4">${t}</span>`;
  }
  return t
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="text-accent">$1</span>')
    .replace(
      /\b(POST|GET|PATCH|PUT|DELETE)\b/g,
      '<span class="text-accent font-semibold">$1</span>',
    )
    .replace(
      /\b(const|await|async|function|return|import|from|export|new|let)\b/g,
      '<span class="text-fg-2 font-medium">$1</span>',
    );
}

/**
 * Page-local code block used by the Integrate page — canonical-token version
 * of the shared brand `CodeBlock`, styled per DESIGN.md (panel surfaces,
 * `--radius`, single accent color).
 */
export function CodeBlock({
  code,
  title,
  copyable = true,
  className,
}: {
  code: string;
  title?: string;
  copyable?: boolean;
  className?: string;
}) {
  const { copied, copy } = useCopiedText();
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius)] border border-edge bg-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-edge-soft bg-panel2 px-3 py-2">
        <span className="as-label text-[10.5px]">{title || "code"}</span>
        {copyable && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-0.5 text-fg-3 transition-colors hover:bg-panel hover:text-fg"
            onClick={() => copy(code)}
          >
            {copied ? (
              <CheckIcon size={12} className="text-accent" aria-hidden="true" />
            ) : (
              <CopyIcon size={12} aria-hidden="true" />
            )}
            <span className="font-mono text-[11px]">{copied ? "copied" : "copy"}</span>
          </button>
        )}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.7] text-fg-2">
        {lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: index included with line content for uniqueness; duplicate lines are possible
          <div key={`${i}-${line}`} className="flex gap-3.5">
            <span className="w-4 flex-shrink-0 select-none text-right text-fg-4">{i + 1}</span>
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
