import { cn } from "@/lib/utils";

export type GlyphKind = "tri" | "stack" | "graph" | "arc" | "spark" | "ring" | "braces";

export type FrameworkId =
  | "vercel"
  | "tanstack"
  | "langgraph"
  | "cfagents"
  | "workersai"
  | "openai"
  | "rest";

export interface Framework {
  id: FrameworkId;
  name: string;
  tag: string;
  glyph: GlyphKind;
}

/**
 * Framework registry. Monotone, generic marks (not real brand logos) to stay
 * clear of trademarks — swap in official marks if preferred.
 */
export const FRAMEWORKS: Framework[] = [
  { id: "vercel", name: "Vercel AI SDK", tag: "@ai-sdk", glyph: "tri" },
  { id: "tanstack", name: "TanStack AI", tag: "@tanstack/ai", glyph: "stack" },
  { id: "langgraph", name: "LangGraph", tag: "@langchain/graph", glyph: "graph" },
  { id: "cfagents", name: "Cloudflare Agents", tag: "agents", glyph: "arc" },
  { id: "workersai", name: "Workers AI", tag: "env.AI", glyph: "spark" },
  { id: "openai", name: "OpenAI · Anthropic", tag: "sdk", glyph: "ring" },
  { id: "rest", name: "Raw REST", tag: "fetch()", glyph: "braces" },
];

/** Monotone stroke glyph for a framework mark. Uses `currentColor`. */
export function FwGlyph({
  kind,
  size = 18,
  className,
}: {
  kind: GlyphKind;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("text-foreground", className),
  };
  switch (kind) {
    case "tri":
      return (
        <svg {...common}>
          <path d="M12 4 L20 19 L4 19 Z" />
        </svg>
      );
    case "stack":
      return (
        <svg {...common}>
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
      );
    case "graph":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="18" cy="9" r="2.4" />
          <circle cx="9" cy="18" r="2.4" />
          <path d="M8 7l8 1M8 16l1-7" />
        </svg>
      );
    case "arc":
      return (
        <svg {...common}>
          <path d="M5 16a7 7 0 0 1 13-3" />
          <circle cx="18" cy="13" r="1.6" fill="currentColor" />
          <path d="M5 16h3" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v6M12 15v6M5 12h6M15 12h6" />
        </svg>
      );
    case "ring":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      );
    case "braces":
      return (
        <svg {...common}>
          <path d="M9 4c-2 0-2 2-2 4s0 3-2 4c2 1 2 2 2 4s0 4 2 4" />
          <path d="M15 4c2 0 2 2 2 4s0 3 2 4c-2 1-2 2-2 4s0 4-2 4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
