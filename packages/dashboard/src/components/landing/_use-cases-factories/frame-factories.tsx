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
    stroke={accent ? "#22c55e" : "currentColor"}
    strokeWidth={1.2}
    opacity={accent ? 0.5 : 0.25}
    className={pulse ? "animate-pulse-soft" : undefined}
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
