const ACCENT = "#22c55e";

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

const textLine = (x1: number, y: number, x2: number, opacity = 0.2) => (
  <line x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth={1} opacity={opacity} />
);

export const cornerNode = (x: number, y: number, toX: number, toY: number, key: string) => (
  <g key={key}>
    {nodeLabel(x, y)}
    {dashedLine(x + 24, y + 14, toX, toY)}
  </g>
);

const dashedLine = (x1: number, y1: number, x2: number, y2: number, opacity = 0.2) => (
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
