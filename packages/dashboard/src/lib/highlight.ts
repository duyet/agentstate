/**
 * Build-time syntax highlighting via Shiki for marketing code blocks.
 * No client bundle — Astro runs this in page frontmatter during build.
 */
import { codeToHtml } from "shiki";

/** Map tab lang labels to Shiki language ids. */
export function resolveLang(lang: string): string {
  const map: Record<string, string> = {
    sdk: "typescript",
    ts: "typescript",
    typescript: "typescript",
    js: "javascript",
    javascript: "javascript",
    py: "python",
    python: "python",
    bash: "bash",
    shell: "bash",
    sh: "bash",
    json: "json",
    rest: "bash",
    text: "plaintext",
    txt: "plaintext",
  };
  return map[lang.toLowerCase()] ?? lang;
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const language = resolveLang(lang);
  try {
    return await codeToHtml(code.replace(/\n$/, ""), {
      lang: language,
      theme: "github-dark-default",
      transformers: [
        {
          pre(node) {
            // Strip default chrome so our outer shell controls surface.
            node.properties.style = "background:transparent;margin:0;padding:0;overflow-x:auto";
            node.properties.class = "as-shiki-pre";
          },
          code(node) {
            node.properties.class = "as-shiki-code font-mono text-[12.5px] leading-[1.75]";
          },
        },
      ],
    });
  } catch {
    // Unknown language or shiki failure — escaped plain pre.
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="as-shiki-pre" style="background:transparent;margin:0;padding:0"><code class="font-mono text-[12.5px] leading-[1.75] text-fg-2">${escaped}</code></pre>`;
  }
}
