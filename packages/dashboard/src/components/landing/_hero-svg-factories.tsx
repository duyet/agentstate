const ACCENT = "#22c55e";
const PATH_AGENT_TO_DB = "M210 200 Q275 160 340 200";
const PATH_DB_TO_HISTORY = "M460 200 Q525 240 590 200";

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

export const agentNode = () => (
  <g className="animate-node-pulse" style={{ transformOrigin: "150px 200px" }}>
    <rect x="90" y="160" width="120" height="80" rx="16" stroke="currentColor" strokeWidth="1.5" />
    <text
      x="150"
      y="207"
      textAnchor="middle"
      fill="currentColor"
      fontFamily="monospace"
      fontSize="14"
    >
      Agent
    </text>
    <circle cx="110" cy="180" r="4" fill={ACCENT} className="animate-pulse-soft" />
  </g>
);

export const agentStateDbNode = () => (
  <g className="animate-node-pulse" style={{ transformOrigin: "400px 200px" }}>
    {/* Cylinder body */}
    <path
      d="M340 170 L340 230 Q340 250 400 250 Q460 250 460 230 L460 170"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Cylinder top ellipse */}
    <ellipse cx="400" cy="170" rx="60" ry="20" stroke="currentColor" strokeWidth="1.5" />
    {/* Cylinder bottom ellipse */}
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
    <text
      x="400"
      y="215"
      textAnchor="middle"
      fill="currentColor"
      fontFamily="monospace"
      fontSize="12"
    >
      AgentState
    </text>
    <circle cx="400" cy="190" r="3" fill={ACCENT} className="animate-pulse-soft" />
  </g>
);

export const historyNode = () => (
  <g className="animate-node-pulse" style={{ transformOrigin: "650px 200px" }}>
    <rect x="590" y="160" width="120" height="80" rx="16" stroke="currentColor" strokeWidth="1.5" />
    <text
      x="650"
      y="195"
      textAnchor="middle"
      fill="currentColor"
      fontFamily="monospace"
      fontSize="14"
    >
      History
    </text>
    {/* Chat bubble shapes inside */}
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
  </g>
);

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
