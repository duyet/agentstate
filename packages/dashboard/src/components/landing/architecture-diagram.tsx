"use client";

const MONO_FONT = "var(--font-mono, monospace)";

function ArchitectureSvg() {
  // Layout: hub-and-spoke centered on AgentState
  // Hub: AgentState API in the center
  // Spoke 1 (left):   Your Agent
  // Spoke 2 (right):  D1 Database
  // Spoke 3 (bottom): Workers AI

  const viewW = 800;
  const viewH = 300;

  // Node dimensions
  const nodeW = 160;
  const nodeH = 90;

  // Hub (center)
  const hubX = (viewW - nodeW) / 2; // 320
  const hubY = 40;
  const hubCX = hubX + nodeW / 2; // center-X = 400
  const hubCY = hubY + nodeH / 2; // center-Y = 85

  // Left spoke: Your Agent (shares same Y as hub — all top-row nodes are aligned)
  const leftX = 50;
  const leftCX = leftX + nodeW / 2; // 130

  // Right spoke: D1 Database
  const rightX = viewW - 50 - nodeW; // 590
  const rightCX = rightX + nodeW / 2; // 670

  // Bottom spoke: Workers AI
  const botX = (viewW - nodeW) / 2; // 320
  const botY = 185;
  const botCX = botX + nodeW / 2; // 400

  // Connection path endpoints (edge of node boxes)
  const leftToHubX1 = leftX + nodeW;
  const leftToHubX2 = hubX;

  const hubToRightX1 = hubX + nodeW;
  const hubToRightX2 = rightX;

  const hubToBottomY1 = hubY + nodeH;
  const hubToBottomY2 = botY;

  // Pre-computed bezier path strings (reused by both <path> and <animateMotion>)
  const pathLeft = `M${leftToHubX1},${hubCY} C${leftToHubX1 + 30},${hubCY} ${leftToHubX2 - 30},${hubCY} ${leftToHubX2},${hubCY}`;
  const pathRight = `M${hubToRightX1},${hubCY} C${hubToRightX1 + 30},${hubCY} ${hubToRightX2 - 30},${hubCY} ${hubToRightX2},${hubCY}`;
  const pathBottom = `M${hubCX},${hubToBottomY1} C${hubCX},${hubToBottomY1 + 20} ${botCX},${hubToBottomY2 - 20} ${botCX},${hubToBottomY2}`;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="w-full"
      aria-hidden="true"
      role="presentation"
      fill="none"
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="currentColor" opacity="0.4" />
        </marker>

        {/* Subtle radial glow behind the hub */}
        <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>

        <style>{`
          @keyframes border-pulse {
            0%, 100% { stroke-opacity: 0.6; }
            50% { stroke-opacity: 1; }
          }
          .agent-border { animation: border-pulse 2.5s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Hub glow ellipse */}
      <ellipse
        cx={hubCX}
        cy={hubCY}
        rx="120"
        ry="70"
        fill="url(#hubGlow)"
      />

      {/* ======= Connection paths ======= */}

      {/* Left: Your Agent -> AgentState */}
      <path
        d={pathLeft}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
        markerEnd="url(#arrowhead)"
      />
      <text
        x={(leftToHubX1 + leftToHubX2) / 2}
        y={hubCY - 14}
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        opacity="0.5"
        style={{ fontFamily: MONO_FONT }}
      >
        REST API
      </text>
      <circle r="2.5" fill="#22c55e" opacity="0.8">
        <animateMotion dur="2.4s" repeatCount="indefinite" path={pathLeft} />
      </circle>

      {/* Right: AgentState -> D1 */}
      <path
        d={pathRight}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
        markerEnd="url(#arrowhead)"
      />
      <text
        x={(hubToRightX1 + hubToRightX2) / 2}
        y={hubCY - 14}
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        opacity="0.5"
        style={{ fontFamily: MONO_FONT }}
      >
        Drizzle ORM
      </text>
      <circle r="2.5" fill="#22c55e" opacity="0.8">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="1.2s" path={pathRight} />
      </circle>

      {/* Bottom: AgentState -> Workers AI */}
      <path
        d={pathBottom}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.3"
        markerEnd="url(#arrowhead)"
      />
      <text
        x={hubCX + 28}
        y={(hubToBottomY1 + hubToBottomY2) / 2 + 4}
        textAnchor="start"
        fill="currentColor"
        fontSize="10"
        opacity="0.5"
        style={{ fontFamily: MONO_FONT }}
      >
        Workers AI
      </text>
      <circle r="2.5" fill="#22c55e" opacity="0.8">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="0.6s" path={pathBottom} />
      </circle>

      {/* ======= Node 1: Your Agent (left) ======= */}
      <rect
        x={leftX}
        y={hubY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Terminal/agent icon */}
      <g transform={`translate(${leftCX - 11}, ${hubY + 14})`} opacity="0.6">
        <rect x="0" y="0" width="22" height="16" rx="3" stroke="currentColor" strokeWidth="1.2" />
        <polyline points="4,5 8,8 4,11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="10" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      <text
        x={leftCX}
        y={hubY + 52}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        Your Agent
      </text>

      <text
        x={leftCX}
        y={hubY + nodeH + 20}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        Any HTTP client
      </text>

      {/* ======= Node 2: AgentState API (hub, center) ======= */}
      <rect
        x={hubX}
        y={hubY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="#22c55e"
        strokeWidth="2"
        className="agent-border"
      />

      {/* AgentState logo icon */}
      <g transform={`translate(${hubCX - 12}, ${hubY + 12})`} opacity="0.8">
        <rect x="0" y="0" width="24" height="24" rx="5" fill="currentColor" />
        <g stroke="white" strokeWidth="1.5" strokeLinecap="round">
          <line x1="6" y1="8" x2="14" y2="8" />
          <line x1="9" y1="12" x2="18" y2="12" />
          <line x1="6" y1="16" x2="13" y2="16" />
        </g>
        <circle cx="18" cy="16" r="1.5" fill="#22c55e" />
      </g>

      <text
        x={hubCX}
        y={hubY + 54}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        AgentState
      </text>

      <text
        x={hubCX}
        y={hubY + nodeH + 20}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        Hono on Workers
      </text>

      {/* Feature badges below hub sublabel */}
      {/* Badge: Conversations */}
      <rect
        x={hubCX - 118}
        y={hubY + nodeH + 32}
        width="76"
        height="16"
        rx="4"
        stroke="#22c55e"
        strokeWidth="1"
        opacity="0.35"
      />
      <text
        x={hubCX - 80}
        y={hubY + nodeH + 43}
        textAnchor="middle"
        fill="#22c55e"
        fontSize="9"
        opacity="0.7"
        style={{ fontFamily: MONO_FONT }}
      >
        Conversations
      </text>

      {/* Badge: Token tracking */}
      <rect
        x={hubCX - 36}
        y={hubY + nodeH + 32}
        width="72"
        height="16"
        rx="4"
        stroke="#22c55e"
        strokeWidth="1"
        opacity="0.35"
      />
      <text
        x={hubCX}
        y={hubY + nodeH + 43}
        textAnchor="middle"
        fill="#22c55e"
        fontSize="9"
        opacity="0.7"
        style={{ fontFamily: MONO_FONT }}
      >
        Token tracking
      </text>

      {/* Badge: AI titles */}
      <rect
        x={hubCX + 42}
        y={hubY + nodeH + 32}
        width="76"
        height="16"
        rx="4"
        stroke="#22c55e"
        strokeWidth="1"
        opacity="0.35"
      />
      <text
        x={hubCX + 80}
        y={hubY + nodeH + 43}
        textAnchor="middle"
        fill="#22c55e"
        fontSize="9"
        opacity="0.7"
        style={{ fontFamily: MONO_FONT }}
      >
        AI titles
      </text>

      {/* ======= Node 3: D1 Database (right) ======= */}
      <rect
        x={rightX}
        y={hubY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Database cylinder icon */}
      <g transform={`translate(${rightCX - 10}, ${hubY + 13})`} opacity="0.6">
        <ellipse cx="10" cy="4" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" />
        <path d="M0 4v14c0 2.2 4.5 4 10 4s10-1.8 10-4V4" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M0 11c0 2.2 4.5 4 10 4s10-1.8 10-4"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      <text
        x={rightCX}
        y={hubY + 54}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        D1 Database
      </text>

      <text
        x={rightCX}
        y={hubY + nodeH + 20}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        SQLite at edge
      </text>

      {/* ======= Node 4: Workers AI (bottom) ======= */}
      <rect
        x={botX}
        y={botY}
        width={nodeW}
        height={nodeH}
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Sparkle / AI icon */}
      <g transform={`translate(${botCX - 11}, ${botY + 13})`} opacity="0.6">
        {/* Simple star/sparkle shape */}
        <line x1="11" y1="0" x2="11" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="0" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <circle cx="11" cy="11" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      </g>

      <text
        x={botCX}
        y={botY + 54}
        textAnchor="middle"
        fill="currentColor"
        fontSize="13"
        fontWeight="500"
        style={{ fontFamily: MONO_FONT }}
      >
        Workers AI
      </text>

      <text
        x={botCX}
        y={botY + nodeH + 20}
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        opacity="0.4"
      >
        Title generation
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

      {/* Mobile: vertical stack with more detail */}
      <div className="md:hidden text-sm font-mono text-muted-foreground space-y-1">
        <div>Your Agent</div>
        <div className="text-muted-foreground/40 pl-2">↓ REST API</div>
        <div className="font-medium text-foreground">AgentState API</div>
        <div className="pl-2 flex gap-6">
          <span>
            <span className="text-muted-foreground/40">↓ Drizzle ORM</span>
            <div>D1 Database</div>
          </span>
          <span>
            <span className="text-muted-foreground/40">↓ Workers AI</span>
            <div>AI Features</div>
          </span>
        </div>
      </div>

      {/* Desktop: full SVG diagram */}
      <div className="hidden md:block">
        <ArchitectureSvg />
      </div>
    </section>
  );
}
