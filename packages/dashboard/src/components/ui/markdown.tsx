"use client";

import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Markdown — renders message content with GitHub-flavored markdown, styled with
 * the dashboard design tokens (no Tailwind typography plugin needed). Used to
 * render assistant/user message bodies in the conversation viewer.
 *
 * Links open in a new tab with safe rel attributes. Code blocks and inline code
 * use the mono token surface.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-[13px] leading-relaxed text-fg-2", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ className: c, ...props }) => (
            <p className={cn("my-2 first:mt-0 last:mb-0", c)} {...props} />
          ),
          strong: ({ className: c, ...props }) => (
            <strong className={cn("font-semibold text-fg", c)} {...props} />
          ),
          em: ({ className: c, ...props }) => <em className={cn("italic", c)} {...props} />,
          a: ({ className: c, ...props }) => (
            <a
              className={cn("text-accent underline underline-offset-2 hover:opacity-80", c)}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          h1: ({ className: c, ...props }) => (
            <h1
              className={cn("mt-3 mb-1 text-[15px] font-semibold text-fg first:mt-0", c)}
              {...props}
            />
          ),
          h2: ({ className: c, ...props }) => (
            <h2
              className={cn("mt-3 mb-1 text-[14px] font-semibold text-fg first:mt-0", c)}
              {...props}
            />
          ),
          h3: ({ className: c, ...props }) => (
            <h3
              className={cn("mt-3 mb-1 text-[13.5px] font-semibold text-fg first:mt-0", c)}
              {...props}
            />
          ),
          ul: ({ className: c, ...props }) => (
            <ul className={cn("my-2 list-disc space-y-1 pl-5", c)} {...props} />
          ),
          ol: ({ className: c, ...props }) => (
            <ol className={cn("my-2 list-decimal space-y-1 pl-5", c)} {...props} />
          ),
          li: ({ className: c, ...props }) => <li className={cn("text-fg-2", c)} {...props} />,
          blockquote: ({ className: c, ...props }) => (
            <blockquote
              className={cn("my-2 border-l-2 border-edge pl-3 text-fg-3 italic", c)}
              {...props}
            />
          ),
          hr: ({ className: c, ...props }) => (
            <hr className={cn("my-3 border-edge-soft", c)} {...props} />
          ),
          code: ({ className: c, ...props }: ComponentPropsWithoutRef<"code">) => {
            // Inline code only — fenced blocks are wrapped by <pre> below, which
            // sets its own surface; here we style the inline span.
            const isBlock = typeof c === "string" && c.includes("language-");
            if (isBlock) return <code className={c} {...props} />;
            return (
              <code
                className="rounded bg-panel2 px-1 py-0.5 font-mono text-[12px] text-fg"
                {...props}
              />
            );
          },
          pre: ({ className: c, ...props }) => (
            <pre
              className={cn(
                "my-2 overflow-x-auto rounded-[var(--radius)] border border-edge bg-panel2 p-3 font-mono text-[12px] text-fg-2",
                c,
              )}
              {...props}
            />
          ),
          table: ({ className: c, ...props }) => (
            <div className="my-2 overflow-x-auto">
              <table className={cn("w-full border-collapse text-left", c)} {...props} />
            </div>
          ),
          th: ({ className: c, ...props }) => (
            <th
              className={cn("border border-edge-soft px-2 py-1 font-medium text-fg", c)}
              {...props}
            />
          ),
          td: ({ className: c, ...props }) => (
            <td className={cn("border border-edge-soft px-2 py-1", c)} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
