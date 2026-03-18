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
      {title && <h3 className="font-medium mb-3">{title}</h3>}
      <div className="rounded border border-border overflow-hidden">
        {showHeader && (
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-card">
            {filename && (
              <span className="text-xs font-mono text-muted-foreground">{filename}</span>
            )}
            <div className="flex-1" />
            <CopyButton text={code} />
          </div>
        )}
        <pre
          className={`p-5 text-xs font-mono leading-relaxed text-foreground/80 overflow-x-auto ${
            language ? `language-${language}` : ""
          }`}
        >
          {code}
        </pre>
      </div>
    </div>
  );
}
