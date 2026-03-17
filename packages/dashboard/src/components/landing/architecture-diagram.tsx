"use client";

const MONO_FONT = "var(--font-mono, monospace)";

function ArchitectureSvg() {
  // Node positions (centered in their columns)
  const node1X = 40;
  const node2X = 290;
  const node3X = 540;
  const nodeY = 40;
  const nodeW = 180;
  const nodeH = 100;

  // Arrow path Y center
  const arrowY = nodeY + nodeH / 2;

  // Path start/end X positions
  const path1Start = node1X + nodeW;
  const path1End = node2X;
  const path2Start = node2X + nodeW;
  const path2End = node3X;

  return (
    <svg
      viewBox="0 0 800 220"
      className="w-full"
      aria-hidden="true"
      role="presentation"
      fill="none"
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="currentColor" opacity="0.4" />
        </marker>

        {/* Pulse animation for AgentState border */}
        <style>{`
          @keyframes border-pulse {
            0%, 100% { stroke-opacity: 0.6; }
            50% { stroke-opacity: 1; }
          }
          .agent-border {
            animation: border-pulse 2.5s ease-in-out infinite;
          }
        `}</style>
      </defs>

      {/* === Connection paths === */}

      {/* Path 1: Your App -> AgentState */}
      <line
        x1={path1Start}
        y1={arrowY}
        x2={path1End}
        y2={arrowY}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
        markerEnd="url(#arrowhead)"
      />

      {/* Path 1 label */}
      <text
        x={(path1Start + path1End) / 2}
        y={arrowY - 12}
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        opacity="0.5"
        style={{ fontFamily: MONO_FONT }}
      >
        REST API
      </text>

      {/* Path 1 animated dot */}
      <circle r="2.5" fill="#22c55e" opacity="0.5">
        <animateMotion
          dur="2.5s"
          repeatCount="indefinite"
          path={`M${path1Start},${arrowY} L${path1End},${arrowY}`}
        />
      </circle>

      {/* Path 2: AgentState -> D1 */}
      <line
        x1={path2Start}
        y1={arrowY}
        x2={path2End}
        y2={arrowY}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
        markerEnd="url(#arrowhead)"
      />

      {/* Path 2 label */}
      <text
        x={(path2Start + path2End) / 2}
        y={arrowY - 12}
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        opacity="0.5"
        style={{ fontFamily: MONO_FONT }}
      >
        Drizzle ORM
      </text>

      {/* Path 2 animated dot (delayed) */}
      <circle r="2.5" fill="#22c55e" opacity="0.5">
        <animateMotion
          dur="2.5s"
          repeatCount="indefinite"
          begin="1.2s"
          path={`M${path2Start},${arrowY} L${path2End},${arrowY}`}
        />
      </circle>

      {/* === Node 1: Your App === */}
      <rect
        x={node1X}
        y={nodeY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Browser icon */}
      <g transform={`translate(${node1X + nodeW / 2 - 14}, ${nodeY + 18})`} opacity="0.6">
        <rect x="0" y="0" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.2" />
        <line x1="0" y1="6" x2="28" y2="6" stroke="currentColor" strokeWidth="1" />
        <circle cx="4" cy="3" r="1" fill="currentColor" />
        <circle cx="8" cy="3" r="1" fill="currentColor" />
        <circle cx="12" cy="3" r="1" fill="currentColor" />
      </g>

      {/* Node 1 label */}
      <text
        x={node1X + nodeW / 2}
        y={nodeY + 60}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        Your App
      </text>

      {/* Node 1 sublabel */}
      <text
        x={node1X + nodeW / 2}
        y={nodeY + nodeH + 22}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        Any HTTP client
      </text>

      {/* === Node 2: AgentState API === */}
      <rect
        x={node2X}
        y={nodeY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="#22c55e"
        strokeWidth="2"
        className="agent-border"
      />

      {/* AgentState logo icon */}
      <g transform={`translate(${node2X + nodeW / 2 - 12}, ${nodeY + 14})`} opacity="0.7">
        <rect x="0" y="0" width="24" height="24" rx="5" fill="currentColor" />
        <g stroke="white" strokeWidth="1.5" strokeLinecap="round">
          <line x1="6" y1="8" x2="14" y2="8" />
          <line x1="9" y1="12" x2="18" y2="12" />
          <line x1="6" y1="16" x2="13" y2="16" />
        </g>
        <circle cx="18" cy="16" r="1.5" fill="#22c55e" />
      </g>

      {/* Node 2 label */}
      <text
        x={node2X + nodeW / 2}
        y={nodeY + 60}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        AgentState
      </text>

      {/* Node 2 sublabel */}
      <text
        x={node2X + nodeW / 2}
        y={nodeY + nodeH + 22}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        Hono on Workers
      </text>

      {/* === Node 3: D1 Database === */}
      <rect
        x={node3X}
        y={nodeY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Database cylinder icon */}
      <g transform={`translate(${node3X + nodeW / 2 - 10}, ${nodeY + 14})`} opacity="0.6">
        <ellipse cx="10" cy="4" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" />
        <path d="M0 4v14c0 2.2 4.5 4 10 4s10-1.8 10-4V4" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M0 11c0 2.2 4.5 4 10 4s10-1.8 10-4"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* Node 3 label */}
      <text
        x={node3X + nodeW / 2}
        y={nodeY + 64}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        D1 Database
      </text>

      {/* Node 3 sublabel */}
      <text
        x={node3X + nodeW / 2}
        y={nodeY + nodeH + 22}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        SQLite at edge
      </text>
    </svg>
  );
}

export function ArchitectureDiagram() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 animate-fade-in-up"
      style={{ animationDelay: "0.4s" }}
    >
      <h2 className="text-lg font-medium mb-5">Architecture</h2>

      {/* Mobile: simplified text */}
      <div className="md:hidden text-sm text-muted-foreground font-mono flex items-center gap-2 flex-wrap">
        <span>Your App</span>
        <span className="text-muted-foreground/40">&rarr;</span>
        <span>AgentState API</span>
        <span className="text-muted-foreground/40">&rarr;</span>
        <span>D1 Database</span>
      </div>

      {/* Desktop: full SVG diagram */}
      <div className="hidden md:block">
        <ArchitectureSvg />
      </div>
    </section>
  );
}
