export type UseCaseVisualVariant = "chatbot" | "sessions" | "analytics" | "frameworks";

const heroConsoleCode = [
  "POST /api/v1/conversations",
  "Authorization: Bearer as_live_...",
  "",
  "{",
  '  "messages": [{ "role": "user" }],',
  '  "metadata": { "agent": "support" }',
  "}",
].join("\n");

export function HeroConsole() {
  return (
    <section className="landing-console" aria-label="AgentState runtime overview">
      <div className="landing-console__bar">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <strong>agentstate.app</strong>
      </div>
      <div className="landing-console__grid">
        <div className="landing-console__main">
          <div className="landing-console__label">runtime event</div>
          <pre>{heroConsoleCode}</pre>
        </div>
        <div className="landing-console__side">
          <div>
            <span>Conversation storage</span>
            <strong>threads</strong>
          </div>
          <div>
            <span>Usage analytics</span>
            <strong>tokens</strong>
          </div>
          <div>
            <span>Export and audit</span>
            <strong>history</strong>
          </div>
        </div>
      </div>
      <svg viewBox="0 0 520 180" role="img" aria-labelledby="hero-chart-title hero-chart-desc">
        <title id="hero-chart-title">Conversation history chart</title>
        <desc id="hero-chart-desc">
          A compact illustrative chart showing steady conversation writes and retrieval activity.
        </desc>
        <rect className="svg-panel" x="18" y="16" width="484" height="148" rx="10" />
        <path
          className="svg-gridline"
          d="M52 48H468M52 84H468M52 120H468M96 34V140M180 34V140M264 34V140M348 34V140M432 34V140"
        />
        <path
          className="svg-area"
          d="M52 128C82 118 88 96 118 101C150 106 150 76 180 80C212 84 214 58 246 66C282 76 288 42 322 52C356 62 366 36 398 44C430 52 438 34 468 40V140H52Z"
        />
        <path
          className="svg-line svg-line--clay"
          d="M52 128C82 118 88 96 118 101C150 106 150 76 180 80C212 84 214 58 246 66C282 76 288 42 322 52C356 62 366 36 398 44C430 52 438 34 468 40"
        />
        <path
          className="svg-line svg-line--olive"
          d="M52 114C98 112 112 122 148 108C184 94 198 106 232 98C270 89 284 99 318 84C356 68 382 82 414 72C442 64 454 58 468 62"
        />
        <circle className="svg-dot" cx="398" cy="44" r="5" />
        <text className="svg-label" x="52" y="154">
          ingest
        </text>
        <text className="svg-label" x="406" y="154">
          retrieve
        </text>
      </svg>
    </section>
  );
}

export function StateArchitectureDiagram() {
  return (
    <svg
      className="landing-architecture"
      viewBox="0 0 960 420"
      role="img"
      aria-labelledby="architecture-title architecture-desc"
    >
      <title id="architecture-title">AgentState architecture</title>
      <desc id="architecture-desc">
        Agent runtimes write state to AgentState, durable history is stored, and context is read
        back for future turns.
      </desc>
      <defs>
        <marker
          id="landing-arrow"
          markerHeight="8"
          markerWidth="10"
          orient="auto"
          refX="9"
          refY="4"
        >
          <path d="M0 0L10 4L0 8Z" fill="var(--landing-g500)" />
        </marker>
      </defs>
      <rect className="svg-paper" x="24" y="24" width="912" height="372" rx="12" />
      <rect className="svg-node" x="70" y="92" width="210" height="220" rx="10" />
      <text className="svg-title" x="96" y="132">
        Agent runtime
      </text>
      <text className="svg-copy" x="96" y="162">
        Chat UI, worker,
      </text>
      <text className="svg-copy" x="96" y="184">
        cron, or tool loop
      </text>
      <rect className="svg-chip" x="96" y="222" width="132" height="30" rx="8" />
      <text className="svg-chip-text" x="112" y="242">
        LangGraph
      </text>
      <rect className="svg-chip" x="96" y="264" width="148" height="30" rx="8" />
      <text className="svg-chip-text" x="112" y="284">
        AI SDK
      </text>
      <rect className="svg-hub" x="376" y="76" width="208" height="250" rx="12" />
      <text className="svg-hub-title" x="414" y="128">
        AgentState
      </text>
      <text className="svg-hub-copy" x="412" y="162">
        REST API for
      </text>
      <text className="svg-hub-copy" x="412" y="184">
        durable memory
      </text>
      <rect className="svg-hub-chip" x="410" y="222" width="140" height="32" rx="8" />
      <text className="svg-hub-chip-text" x="436" y="243">
        write state
      </text>
      <rect className="svg-hub-chip" x="410" y="268" width="140" height="32" rx="8" />
      <text className="svg-hub-chip-text" x="436" y="289">
        read context
      </text>
      <rect className="svg-node" x="680" y="92" width="210" height="220" rx="10" />
      <text className="svg-title" x="710" y="132">
        Durable history
      </text>
      <text className="svg-copy" x="710" y="162">
        Queryable memory
      </text>
      <text className="svg-copy" x="710" y="184">
        and audit trail
      </text>
      <circle className="svg-bullet" cx="722" cy="228" r="7" />
      <text className="svg-copy" x="742" y="234">
        Conversations
      </text>
      <circle className="svg-bullet svg-bullet--olive" cx="722" cy="268" r="7" />
      <text className="svg-copy" x="742" y="274">
        Metadata
      </text>
      <circle className="svg-bullet svg-bullet--clay" cx="722" cy="308" r="7" />
      <text className="svg-copy" x="742" y="314">
        Analytics
      </text>
      <path className="svg-arrow" d="M300 154H356" />
      <text className="svg-label" x="310" y="136">
        events
      </text>
      <path className="svg-arrow" d="M604 154H660" />
      <text className="svg-label" x="612" y="136">
        persist
      </text>
      <path className="svg-arrow svg-arrow--back" d="M660 270H604" />
      <text className="svg-label" x="612" y="300">
        context
      </text>
      <path className="svg-arrow svg-arrow--back" d="M356 270H300" />
      <text className="svg-label" x="308" y="300">
        resume
      </text>
    </svg>
  );
}

export function UseCaseVisual({ variant }: { variant: UseCaseVisualVariant }) {
  const sharedProps = {
    viewBox: "0 0 360 180",
    className: "landing-usecase-visual",
    role: "img",
  } as const;

  if (variant === "sessions") {
    return (
      <svg {...sharedProps} aria-label="Multi-session memory timeline">
        <rect className="svg-paper" x="32" y="28" width="296" height="124" rx="10" />
        <path className="svg-gridline" d="M76 92H284" />
        <circle className="svg-node" cx="92" cy="92" r="22" />
        <circle className="svg-node" cx="180" cy="92" r="22" />
        <circle className="svg-bullet" cx="268" cy="92" r="22" />
        <path
          className="svg-line svg-line--olive"
          d="M92 122C124 142 148 142 180 122C212 102 236 102 268 122"
        />
        <rect className="svg-chip" x="68" y="52" width="48" height="16" rx="5" />
        <rect className="svg-chip" x="156" y="52" width="48" height="16" rx="5" />
        <rect className="svg-chip svg-chip--clay" x="244" y="52" width="48" height="16" rx="5" />
      </svg>
    );
  }

  if (variant === "analytics") {
    return (
      <svg {...sharedProps} aria-label="Agent analytics dashboard">
        <rect className="svg-paper" x="38" y="30" width="284" height="120" rx="10" />
        <rect className="svg-chip" x="58" y="50" width="64" height="30" rx="8" />
        <rect className="svg-chip" x="140" y="50" width="64" height="30" rx="8" />
        <rect className="svg-chip svg-chip--dark" x="222" y="50" width="64" height="30" rx="8" />
        <path className="svg-line svg-line--clay" d="M70 120L88 106L106 114L128 94L148 106" />
        <rect className="svg-bar" x="190" y="102" width="14" height="28" rx="4" />
        <rect className="svg-bar svg-bar--olive" x="214" y="88" width="14" height="42" rx="4" />
        <rect className="svg-bar svg-bar--clay" x="238" y="76" width="14" height="54" rx="4" />
        <rect className="svg-bar" x="262" y="96" width="14" height="34" rx="4" />
      </svg>
    );
  }

  if (variant === "frameworks") {
    return (
      <svg {...sharedProps} aria-label="Framework integrations">
        <rect className="svg-paper" x="38" y="30" width="284" height="120" rx="10" />
        <circle className="svg-bullet" cx="180" cy="90" r="24" />
        <path className="svg-hub-mark" d="M168 90H192M180 78V102" />
        <rect className="svg-chip" x="64" y="52" width="76" height="30" rx="8" />
        <rect className="svg-chip" x="220" y="52" width="76" height="30" rx="8" />
        <rect className="svg-chip" x="64" y="106" width="76" height="30" rx="8" />
        <rect className="svg-chip" x="220" y="106" width="76" height="30" rx="8" />
        <path
          className="svg-gridline"
          d="M140 67L162 79M220 67L198 79M140 121L162 101M220 121L198 101"
        />
      </svg>
    );
  }

  return (
    <svg {...sharedProps} aria-label="Chatbot conversation storage">
      <rect className="svg-paper" x="42" y="28" width="276" height="124" rx="10" />
      <rect className="svg-chip" x="62" y="48" width="104" height="18" rx="6" />
      <rect className="svg-chip" x="62" y="76" width="168" height="24" rx="8" />
      <rect className="svg-chip svg-chip--dark" x="130" y="110" width="168" height="24" rx="8" />
      <path className="svg-gridline" d="M82 88H200M150 122H268" />
      <path className="svg-line svg-line--clay" d="M210 62H262M232 62V84" />
      <circle className="svg-bullet" cx="282" cy="62" r="8" />
      <circle className="svg-dot" cx="78" cy="122" r="8" />
    </svg>
  );
}
