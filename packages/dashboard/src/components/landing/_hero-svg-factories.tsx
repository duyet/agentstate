const ACCENT = "#22c55e";
const PATHS = {
  AGENT_TO_DB: "M210 200 Q275 160 340 200",
  DB_TO_HISTORY: "M460 200 Q525 240 590 200",
} as const;

// SVG Helpers
const pulsingDot = (cx: number, cy: number, r = 3) => (
  <circle cx={cx} cy={cy} r={r} fill={ACCENT} className="animate-pulse-soft" />
);

const label = (x: number, y: number, text: string, fontSize: 12 | 14 = 14) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    fill="currentColor"
    fontFamily="monospace"
    fontSize={fontSize}
  >
    {text}
  </text>
);

const nodeWrapper = (originX: number, originY: number, children: React.ReactNode) => (
  <g className="animate-node-pulse" style={{ transformOrigin: `${originX}px ${originY}px` }}>
    {children}
  </g>
);

const rectNode = (
  x: number,
  y: number,
  width: number,
  height: number,
  cx: number,
  labelText: string,
  labelY: number,
  extras?: React.ReactNode,
) =>
  nodeWrapper(
    cx,
    y + height / 2,
    <>
      <rect x={x} y={y} width={width} height={height} rx="16" stroke="currentColor" strokeWidth="1.5" />
      {label(cx, labelY, labelText)}
      {extras}
    </>,
  );

const dbNode = (cx: number, cy: number, labelText: string, labelY: number, extras?: React.ReactNode) =>
  nodeWrapper(
    cx,
    cy,
    <>
      <path d={`M${cx - 60} ${cy - 30} L${cx - 60} ${cy + 30} Q${cx - 60} ${cy + 50} ${cx} ${cy + 50} Q${cx + 60} ${cy + 50} ${cx + 60} ${cy + 30} L${cx + 60} ${cy - 30}`} stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy - 30} rx="60" ry="20" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy + 30} rx="60" ry="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      {label(cx, labelY, labelText, 12)}
      {extras}
    </>,
  );

// Grid
export const backgroundGrid = () => (
  <g opacity="0.03" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6">
    {[80, 160, 240, 320, 400, 480, 560, 640, 720].map((x) => (
      <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="400" />
    ))}
    {[80, 160, 240, 320].map((y) => (
      <line key={`h-${y}`} x1="0" y1={y} x2="800" y2={y} />
    ))}
  </g>
);

// Nodes
export const agentNode = () => rectNode(90, 160, 120, 80, 150, "Agent", 207, pulsingDot(110, 180, 4));

export const agentStateDbNode = () => dbNode(400, 200, "AgentState", 215, pulsingDot(400, 190));

const historyExtras = (
  <>
    <rect x="615" y="206" width="30" height="10" rx="4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <rect x="650" y="218" width="36" height="10" rx="4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </>
);
export const historyNode = () => rectNode(590, 160, 120, 80, 650, "History", 195, historyExtras);

// Connections
export const connectionPath = (d: string) => (
  <path d={d} stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="animate-draw-line" />
);

const dataPacket = (path: string, begin?: string) => (
  <circle r="3" fill={ACCENT} opacity="0.6">
    <animateMotion dur="3s" repeatCount="indefinite" path={path} begin={begin} />
  </circle>
);

export const dataPackets = () => (
  <>
    {dataPacket(PATHS.AGENT_TO_DB)}
    {dataPacket(PATHS.AGENT_TO_DB, "1.5s")}
    {dataPacket(PATHS.DB_TO_HISTORY, "0.5s")}
    {dataPacket(PATHS.DB_TO_HISTORY, "2s")}
  </>
);
