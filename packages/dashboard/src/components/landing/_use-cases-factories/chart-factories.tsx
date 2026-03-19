const ACCENT = "#22c55e";

export const chartContainer = (x: number, y: number, w: number, h: number) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={4}
    stroke="currentColor"
    strokeWidth={1.2}
    opacity={0.2}
  />
);

export const bar = (x: number, y: number, h: number, accent = false) => (
  <rect
    x={x}
    y={y}
    width={12}
    height={h}
    rx={2}
    stroke={accent ? ACCENT : "currentColor"}
    strokeWidth={1}
    opacity={accent ? 0.5 : 0.25}
  />
);

export const pulseRing = (cx: number, cy: number, r: number, innerR = 0) => (
  <g>
    <circle cx={cx} cy={cy} r={r} stroke={ACCENT} strokeWidth={1.5} opacity={0.7} />
    {innerR > 0 && (
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        stroke={ACCENT}
        strokeWidth={1.2}
        opacity={0.4}
        className="animate-pulse-soft"
      />
    )}
  </g>
);
