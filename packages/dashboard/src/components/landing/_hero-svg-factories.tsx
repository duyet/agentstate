const ACCENT = "#22c55e";
const PATH_AGENT_TO_DB = "M210 200 Q275 160 340 200";
const PATH_DB_TO_HISTORY = "M460 200 Q525 240 590 200";

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
export const agentNode = () =>
  nodeWrapper(
    150,
    200,
    <>
      <rect
        x="90"
        y="160"
        width="120"
        height="80"
        rx="16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {label(150, 207, "Agent")}
      {pulsingDot(110, 180, 4)}
    </>,
  );

export const agentStateDbNode = () =>
  nodeWrapper(
    400,
    200,
    <>
      <path
        d="M340 170 L340 230 Q340 250 400 250 Q460 250 460 230 L460 170"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse cx="400" cy="170" rx="60" ry="20" stroke="currentColor" strokeWidth="1.5" />
      <ellipse
        cx="400"
        cy="230"
        rx="60"
        ry="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.4"
      />
      {label(400, 215, "AgentState", 12)}
      {pulsingDot(400, 190)}
    </>,
  );

export const historyNode = () =>
  nodeWrapper(
    650,
    200,
    <>
      <rect
        x="590"
        y="160"
        width="120"
        height="80"
        rx="16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {label(650, 195, "History")}
      <rect
        x="615"
        y="206"
        width="30"
        height="10"
        rx="4"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <rect
        x="650"
        y="218"
        width="36"
        height="10"
        rx="4"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
    </>,
  );

// Connections
export const connectionPath = (d: string) => (
  <path
    d={d}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeDasharray="6 4"
    className="animate-draw-line"
  />
);

export const dataPacket = (path: string, begin?: string) => (
  <circle r="3" fill={ACCENT} opacity="0.6">
    <animateMotion dur="3s" repeatCount="indefinite" path={path} begin={begin} />
  </circle>
);

export const dataPackets = () => (
  <>
    {dataPacket(PATH_AGENT_TO_DB)}
    {dataPacket(PATH_AGENT_TO_DB, "1.5s")}
    {dataPacket(PATH_DB_TO_HISTORY, "0.5s")}
    {dataPacket(PATH_DB_TO_HISTORY, "2s")}
  </>
);
