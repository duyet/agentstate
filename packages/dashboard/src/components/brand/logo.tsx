import { cn } from "@/lib/utils";

// Satellite node positions in the 64×64 viewBox: one up, two splayed below —
// the literal shape of a single state hub wired to many runtimes.
const SATELLITES = [
  { x: 32, y: 8 },
  { x: 12.2, y: 43 },
  { x: 51.8, y: 43 },
] as const;

const CORE = 32;

/**
 * AgentState logomark — a monotone node network: one filled core wired to
 * satellite adapters. Uses `currentColor`, so set the color via `text-*`.
 */
export function Logo({
  size = 28,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("block", className)}
      role="img"
      aria-label="AgentState"
    >
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        {SATELLITES.map((s) => {
          const dx = s.x - CORE;
          const dy = s.y - CORE;
          const len = Math.hypot(dx, dy);
          const ux = dx / len;
          const uy = dy / len;
          return (
            <line
              key={`${s.x}-${s.y}`}
              x1={CORE + ux * 7.5}
              y1={CORE + uy * 7.5}
              x2={s.x - ux * 4.5}
              y2={s.y - uy * 4.5}
            />
          );
        })}
      </g>
      {SATELLITES.map((s) => (
        <circle
          key={`${s.x}-${s.y}`}
          cx={s.x}
          cy={s.y}
          r={4}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
      ))}
      <circle cx={CORE} cy={CORE} r={7.5} fill="currentColor" />
    </svg>
  );
}

/**
 * Horizontal logo lockup: the mark + "AgentState" wordmark in the display face.
 */
export function Wordmark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[9px] text-foreground", className)}>
      <Logo size={size} />
      <span
        className="font-display font-semibold tracking-[-0.02em] leading-none"
        style={{ fontSize: Math.round(size * 0.62) }}
      >
        AgentState
      </span>
    </span>
  );
}
