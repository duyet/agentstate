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
 * Framework registry. Brand-accurate marks (official simple-icons paths where
 * available) rendered monotone in `currentColor`.
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

// Official brand marks as single fill paths (simple-icons, 24×24 viewBox).
const BRAND_PATHS: Partial<Record<GlyphKind, string>> = {
  // Vercel — solid triangle
  tri: "M24 22.525H0l12-21.05 12 21.05z",
  // OpenAI — interlocking knot
  ring: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z",
  // Cloudflare — cloud mark (used for Workers AI + Agents)
  spark:
    "M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0996-.0184-.1543.0312-.0937.1208-.164.2226-.1729l8.7383-.1123c1.0361-.0478 2.1592-.8867 2.5527-1.917l.499-1.3017a.3.3 0 0 0 .0146-.168C17.748 8.626 15.4561 6.7119 12.7197 6.7119c-2.5215 0-4.6611 1.6279-5.4297 3.8896a2.756 2.756 0 0 0-1.8125-.5039c-1.2168.1201-2.1924 1.0967-2.3125 2.3135a2.823 2.823 0 0 0 .0625.9082C1.1758 13.4199 0 14.6357 0 16.127c0 .1347.0098.2675.0293.3984a.196.196 0 0 0 .1924.167h15.9971a.241.241 0 0 0 .2305-.1729l.0595-.207zm2.7159-5.5664c-.0801 0-.1612.002-.2412.0058a.137.137 0 0 0-.0264.0049.1335.1335 0 0 0-.0918.0908l-.3408 1.1816c-.1475.5068-.0908.9707.1553 1.3154.2246.3164.6045.499 1.0615.5205l1.8457.1123a.1543.1543 0 0 1 .1318.0723.16.16 0 0 1 .0166.1543c-.0312.0937-.1206.164-.2236.1728l-1.9209.1123c-1.0411.0479-2.1592.8868-2.5527 1.917l-.1387.3584c-.0273.0703.0234.1416.0996.1416h6.6055a.2058.2058 0 0 0 .1992-.1494 4.788 4.788 0 0 0 .1768-1.291c0-2.6455-2.1553-4.789-4.8125-4.789",
};

/** Brand/geometric mark for a framework. Uses `currentColor`. */
export function FwGlyph({
  kind,
  size = 18,
  className,
}: {
  kind: GlyphKind;
  size?: number;
  className?: string;
}) {
  const brand = BRAND_PATHS[kind];
  if (brand) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("text-fg", className)}
        aria-hidden="true"
      >
        <path d={brand} />
      </svg>
    );
  }

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("text-fg", className),
  };
  switch (kind) {
    case "stack":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
      );
    case "graph":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="18" cy="9" r="2.4" />
          <circle cx="9" cy="18" r="2.4" />
          <path d="M8 7l8 1M8 16l1-7" />
        </svg>
      );
    case "arc":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 16a7 7 0 0 1 13-3" />
          <circle cx="18" cy="13" r="1.6" fill="currentColor" />
          <path d="M5 16h3" />
        </svg>
      );
    case "braces":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 4c-2 0-2 2-2 4s0 3-2 4c2 1 2 2 2 4s0 4 2 4" />
          <path d="M15 4c2 0 2 2 2 4s0 3 2 4c-2 1-2 2-2 4s0 4-2 4" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
