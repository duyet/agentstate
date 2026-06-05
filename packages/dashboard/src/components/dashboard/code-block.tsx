"use client";

import { CopyButton } from "@/components/copy-button";

interface CodeBlockProps {
  /**
   * Code content to display
   */
  code: string;

  /**
   * Optional filename to display in header
   */
  filename?: string;

  /**
   * Language identifier for syntax (currently unused, for future syntax highlighting)
   */
  language?: string;

  /**
   * Optional title shown above the code block
   */
  title?: string;

  /**
   * Whether to show the header with filename/copy button
   */
  showHeader?: boolean;
}

/**
 * CodeBlock - A copyable code snippet display component.
 *
 * Used for showing API examples, config snippets, and integration code.
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   code='curl -X POST https://api.example.com\n  -H "Authorization: Bearer <token>"'
 *   filename="example.sh"
 *   language="bash"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   code={apiKey}
 *   title="Your API key (shown once)"
 *   showHeader={false}
 * />
 * ```
 */
export function CodeBlock({ code, filename, language, title, showHeader = true }: CodeBlockProps) {
  return (
    <div>
      {title && <h3 className="mb-3 font-medium text-foreground">{title}</h3>}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {showHeader && (
          <div className="flex items-center justify-between border-b border-line-soft bg-background px-3 py-2">
            <span className="as-label text-[10.5px]">{filename || language || "code"}</span>
            <CopyButton text={code} />
          </div>
        )}
        <pre
          className={`overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-ink-2 ${
            language ? `language-${language}` : ""
          }`}
        >
          {code}
        </pre>
      </div>
    </div>
  );
}
