"use client";

const ACCENT = "#22c55e";
const PATH_AGENT_TO_DB = "M210 200 Q275 160 340 200";
const PATH_DB_TO_HISTORY = "M460 200 Q525 240 590 200";

export function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        role="presentation"
        className="absolute inset-0 w-full h-full opacity-[0.08]"
        viewBox="0 0 800 400"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Background grid */}
        <g opacity="0.03" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6">
          <line x1="80" y1="0" x2="80" y2="400" />
          <line x1="160" y1="0" x2="160" y2="400" />
          <line x1="240" y1="0" x2="240" y2="400" />
          <line x1="320" y1="0" x2="320" y2="400" />
          <line x1="400" y1="0" x2="400" y2="400" />
          <line x1="480" y1="0" x2="480" y2="400" />
          <line x1="560" y1="0" x2="560" y2="400" />
          <line x1="640" y1="0" x2="640" y2="400" />
          <line x1="720" y1="0" x2="720" y2="400" />
          <line x1="0" y1="80" x2="800" y2="80" />
          <line x1="0" y1="160" x2="800" y2="160" />
          <line x1="0" y1="240" x2="800" y2="240" />
          <line x1="0" y1="320" x2="800" y2="320" />
        </g>

        {/* ── Agent node (left) ── */}
        <g className="animate-node-pulse" style={{ transformOrigin: "150px 200px" }}>
          <rect
            x="90"
            y="160"
            width="120"
            height="80"
            rx="16"
            stroke="currentColor"
            strokeWidth="1.5"
          />
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
          {/* Pulsing green dot */}
          <circle cx="110" cy="180" r="4" fill={ACCENT} className="animate-pulse-soft" />
        </g>

        {/* ── AgentState database (center) ── */}
        <g className="animate-node-pulse" style={{ transformOrigin: "400px 200px" }}>
          {/* Cylinder body */}
          <path
            d="M340 170 L340 230 Q340 250 400 250 Q460 250 460 230 L460 170"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Cylinder top ellipse */}
          <ellipse cx="400" cy="170" rx="60" ry="20" stroke="currentColor" strokeWidth="1.5" />
          {/* Cylinder bottom ellipse (hidden behind body) */}
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
          {/* Center green dot */}
          <circle cx="400" cy="190" r="3" fill={ACCENT} className="animate-pulse-soft" />
        </g>

        {/* ── History node (right) ── */}
        <g className="animate-node-pulse" style={{ transformOrigin: "650px 200px" }}>
          <rect
            x="590"
            y="160"
            width="120"
            height="80"
            rx="16"
            stroke="currentColor"
            strokeWidth="1.5"
          />
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

        {/* ── Connecting path: Agent → AgentState ── */}
        <path
          d={PATH_AGENT_TO_DB}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          className="animate-draw-line"
        />

        {/* ── Connecting path: AgentState → History ── */}
        <path
          d={PATH_DB_TO_HISTORY}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          className="animate-draw-line"
        />

        {/* ── Data packets: Agent → AgentState ── */}
        <circle r="3" fill={ACCENT} opacity="0.6">
          <animateMotion dur="3s" repeatCount="indefinite" path={PATH_AGENT_TO_DB} />
        </circle>
        <circle r="3" fill={ACCENT} opacity="0.4">
          <animateMotion dur="3s" repeatCount="indefinite" path={PATH_AGENT_TO_DB} begin="1.5s" />
        </circle>

        {/* ── Data packets: AgentState → History ── */}
        <circle r="3" fill={ACCENT} opacity="0.6">
          <animateMotion dur="3s" repeatCount="indefinite" path={PATH_DB_TO_HISTORY} begin="0.5s" />
        </circle>
        <circle r="3" fill={ACCENT} opacity="0.4">
          <animateMotion dur="3s" repeatCount="indefinite" path={PATH_DB_TO_HISTORY} begin="2s" />
        </circle>
      </svg>
    </div>
  );
}
