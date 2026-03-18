const ACCENT = "#22c55e";

export const frame = (x: number, y: number, w: number, h: number, rx = 8) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={rx}
    stroke="currentColor"
    strokeWidth={1.5}
    opacity={0.3}
  />
);

export const titleDots = () => (
  <>
    {[62, 74, 86].map((x) => (
      <circle key={x} cx={x} cy={30} r={3} fill="currentColor" opacity={0.2} />
    ))}
  </>
);

export const textLine = (x1: number, y: number, x2: number, opacity = 0.2) => (
  <line x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth={1} opacity={opacity} />
);

export const dashedLine = (x1: number, y1: number, x2: number, y2: number, opacity = 0.2) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke="currentColor"
    strokeWidth={1.2}
    strokeDasharray="4 3"
    opacity={opacity}
  />
);

export const softRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  accent = false,
  pulse = false,
) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={5}
    stroke={accent ? ACCENT : "currentColor"}
    strokeWidth={1.2}
    opacity={accent ? 0.5 : 0.25}
    className={pulse ? "animate-pulse-soft" : undefined}
  />
);

export const accentCircle = (cx: number, cy: number, r: number, fill = true) => (
  <circle
    cx={cx}
    cy={cy}
    r={r}
    fill={fill ? ACCENT : "none"}
    stroke={ACCENT}
    strokeWidth={fill ? 0 : 1.5}
    opacity={0.9}
  />
);

export const downArrow = (x: number, y1: number, y2: number, opacity = 0.25) => (
  <g opacity={opacity}>
    <path
      d={`M${x} ${y1} L${x} ${y2}`}
      stroke="currentColor"
      strokeWidth={1.2}
      strokeDasharray="3 2"
    />
    <path
      d={`M${x - 5} ${y2 - 2} L${x} ${y2 + 6} L${x + 5} ${y2 - 2}`}
      stroke="currentColor"
      strokeWidth={1.2}
    />
  </g>
);

export const accentBtn = (x: number, y: number, w: number, h: number, textW: number) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={5} stroke={ACCENT} strokeWidth={1.2} opacity={0.6} />
    <line
      x1={x + 16}
      y1={y + 12}
      x2={x + textW}
      y2={y + 12}
      stroke={ACCENT}
      strokeWidth={1}
      opacity={0.35}
    />
  </g>
);

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

export const nodeLabel = (x: number, y: number, accent = false) => (
  <g>
    <rect
      x={x}
      y={y}
      width={50}
      height={28}
      rx={5}
      stroke={accent ? ACCENT : "currentColor"}
      strokeWidth={1.2}
      opacity={0.3}
    />
    {textLine(x + 8, y + 10, x + 42)}
    {textLine(x + 8, y + 20, x + 32, 0.15)}
  </g>
);

export const sessionNode = (cx: number, cy: number, accent = false) => (
  <g>
    <circle
      cx={cx}
      cy={cy}
      r={12}
      stroke={accent ? ACCENT : "currentColor"}
      strokeWidth={1.5}
      opacity={accent ? 0.7 : 0.3}
    />
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={accent ? ACCENT : "currentColor"}
      opacity={accent ? 0.9 : 0.2}
    />
    <line
      x1={cx}
      y1={cy - 20}
      x2={cx}
      y2={cy - 12}
      stroke={accent ? ACCENT : "currentColor"}
      strokeWidth={1}
      opacity={accent ? 0.4 : 0.2}
    />
    <rect
      x={cx - 23}
      y={cy - 32}
      width={46}
      height={12}
      rx={3}
      stroke={accent ? ACCENT : "currentColor"}
      strokeWidth={1}
      opacity={accent ? 0.4 : 0.2}
    />
  </g>
);

export const accentTextLine = (x1: number, y: number, x2: number, opacity = 0.3) => (
  <line x1={x1} y1={y} x2={x2} y2={y} stroke={ACCENT} strokeWidth={1} opacity={opacity} />
);

export const cornerNode = (x: number, y: number, toX: number, toY: number, key: string) => (
  <g key={key}>
    {nodeLabel(x, y)}
    {dashedLine(x + 24, y + 14, toX, toY)}
  </g>
);
