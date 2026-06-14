import { cn } from "@/lib/utils";

// Satellite node positions in the 64×64 viewBox: one up, two splayed below.
const SATELLITES = [
  { x: 32, y: 8 },
  { x: 12.2, y: 43 },
  { x: 51.8, y: 43 },
] as const;

const CORE = 32;
const CORE_R = 7;
const RING_R = 10.5;
const SAT_R = 4.2;

// Quadratic bezier control points — gentle outward arcs that give the
// connections a sense of expansion rather than a static truss.
const ARCS = [
  { cx: 36, cy: 18.5 }, // top → bows right
  { cx: 17, cy: 34 }, // bottom-left → bows outward
  { cx: 47, cy: 34 }, // bottom-right → bows outward
] as const;

/**
 * AgentState logomark — a monotone node network: one filled core wired to
 * satellite adapters via smooth bezier arcs. Uses `currentColor`, so set
 * the color via `text-*`.
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
      {/* Subtle orbital ring around the core */}
      <circle
        cx={CORE}
        cy={CORE}
        r={RING_R}
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.35}
        opacity={0.22}
      />

      {/* Bezier connection paths */}
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        {SATELLITES.map((s, i) => {
          const dx = s.x - CORE;
          const dy = s.y - CORE;
          const len = Math.hypot(dx, dy);
          const ux = dx / len;
          const uy = dy / len;
          const x1 = CORE + ux * (CORE_R + 1.2);
          const y1 = CORE + uy * (CORE_R + 1.2);
          const x2 = s.x - ux * (SAT_R + 1.2);
          const y2 = s.y - uy * (SAT_R + 1.2);
          return (
            <path
              key={`arc-${s.x}-${s.y}`}
              d={`M ${x1} ${y1} Q ${ARCS[i].cx} ${ARCS[i].cy} ${x2} ${y2}`}
            />
          );
        })}
      </g>

      {/* Satellite nodes */}
      {SATELLITES.map((s) => (
        <circle
          key={`sat-${s.x}-${s.y}`}
          cx={s.x}
          cy={s.y}
          r={SAT_R}
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
      ))}

      {/* Core node — filled */}
      <circle cx={CORE} cy={CORE} r={CORE_R} fill="currentColor" />
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
