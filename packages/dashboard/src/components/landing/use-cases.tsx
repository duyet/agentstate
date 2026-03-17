"use client";

function ClickHouseMonitorIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Dashboard frame */}
      <rect
        x="40"
        y="20"
        width="240"
        height="120"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      {/* Top bar */}
      <line x1="40" y1="40" x2="280" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Bar chart columns */}
      <rect
        x="60"
        y="90"
        width="16"
        height="40"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <rect
        x="86"
        y="70"
        width="16"
        height="60"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.3"
      />
      <rect
        x="112"
        y="80"
        width="16"
        height="50"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
        className="animate-pulse-soft"
      />
      <rect
        x="138"
        y="60"
        width="16"
        height="70"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.3"
      />
      <rect
        x="164"
        y="85"
        width="16"
        height="45"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      {/* Chat bubble overlay */}
      <rect
        x="210"
        y="70"
        width="60"
        height="50"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.35"
      />
      {/* Chat lines */}
      <line x1="220" y1="82" x2="260" y2="82" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="220" y1="92" x2="250" y2="92" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line
        x1="220"
        y1="102"
        x2="255"
        y2="102"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      {/* Green accent dot */}
      <circle cx="264" cy="76" r="3" fill="#22c55e" opacity="0.9" />
    </svg>
  );
}

function StampBuilderIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Stamp shape with perforated edges */}
      <rect
        x="70"
        y="20"
        width="180"
        height="120"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      {/* Inner frame */}
      <rect
        x="85"
        y="35"
        width="150"
        height="90"
        rx="4"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      {/* Conversation thread lines inside */}
      <line
        x1="100"
        y1="52"
        x2="160"
        y2="52"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <line
        x1="110"
        y1="64"
        x2="180"
        y2="64"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      <line
        x1="100"
        y1="76"
        x2="170"
        y2="76"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <line
        x1="110"
        y1="88"
        x2="155"
        y2="88"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      {/* Thread connector dots */}
      <circle cx="95" cy="52" r="2" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="95" cy="76" r="2" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="95" y1="54" x2="95" y2="74" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {/* Token counter */}
      <rect
        x="180"
        y="95"
        width="48"
        height="18"
        rx="4"
        stroke="#22c55e"
        strokeWidth="1"
        opacity="0.6"
      />
      <text
        x="204"
        y="108"
        textAnchor="middle"
        fill="#22c55e"
        fontSize="8"
        fontFamily="monospace"
        opacity="0.8"
      >
        1,234
      </text>
    </svg>
  );
}

function SupportBotIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* User chat bubble */}
      <rect
        x="60"
        y="25"
        width="100"
        height="45"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        className="animate-pulse-soft"
      />
      {/* User bubble lines */}
      <line x1="75" y1="40" x2="145" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="75" y1="50" x2="130" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {/* User bubble tail */}
      <path d="M80 70 L75 80 L90 70" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      {/* Bot chat bubble */}
      <rect
        x="160"
        y="55"
        width="110"
        height="45"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        style={{ animationDelay: "1.5s" }}
        className="animate-pulse-soft"
      />
      {/* Bot bubble lines */}
      <line x1="175" y1="70" x2="255" y2="70" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line
        x1="175"
        y1="80"
        x2="240"
        y2="80"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.15"
      />
      {/* Bot bubble tail */}
      <path d="M240 100 L245 110 L230 100" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      {/* Green dot on bot bubble */}
      <circle cx="265" cy="60" r="3" fill="#22c55e" opacity="0.9" />
      {/* Connecting persistence thread */}
      <path
        d="M110 80 C110 120, 210 120, 210 110"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="4 3"
        opacity="0.2"
      />
      {/* Persistence indicator dots */}
      <circle cx="140" cy="118" r="2" fill="currentColor" opacity="0.15" />
      <circle cx="160" cy="122" r="2" fill="currentColor" opacity="0.12" />
      <circle cx="180" cy="120" r="2" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function CodeAssistantIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Editor frame */}
      <rect
        x="50"
        y="15"
        width="220"
        height="130"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      {/* Title bar with dots */}
      <circle cx="66" cy="30" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="76" cy="30" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="86" cy="30" r="3" fill="currentColor" opacity="0.2" />
      <line x1="50" y1="40" x2="270" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Code lines */}
      <line
        x1="65"
        y1="55"
        x2="140"
        y2="55"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      <line
        x1="75"
        y1="67"
        x2="170"
        y2="67"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <line
        x1="75"
        y1="79"
        x2="150"
        y2="79"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      <line
        x1="75"
        y1="91"
        x2="160"
        y2="91"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <line
        x1="65"
        y1="103"
        x2="130"
        y2="103"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      {/* Line numbers */}
      <text
        x="58"
        y="58"
        fill="currentColor"
        fontSize="7"
        fontFamily="monospace"
        opacity="0.15"
        textAnchor="end"
      >
        1
      </text>
      <text
        x="58"
        y="70"
        fill="currentColor"
        fontSize="7"
        fontFamily="monospace"
        opacity="0.15"
        textAnchor="end"
      >
        2
      </text>
      <text
        x="58"
        y="82"
        fill="currentColor"
        fontSize="7"
        fontFamily="monospace"
        opacity="0.15"
        textAnchor="end"
      >
        3
      </text>
      <text
        x="58"
        y="94"
        fill="currentColor"
        fontSize="7"
        fontFamily="monospace"
        opacity="0.15"
        textAnchor="end"
      >
        4
      </text>
      <text
        x="58"
        y="106"
        fill="currentColor"
        fontSize="7"
        fontFamily="monospace"
        opacity="0.15"
        textAnchor="end"
      >
        5
      </text>
      {/* Review comment bubble pointing to line 2 */}
      <rect
        x="190"
        y="52"
        width="70"
        height="28"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.3"
      />
      <line x1="200" y1="62" x2="250" y2="62" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line
        x1="200"
        y1="72"
        x2="240"
        y2="72"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.15"
      />
      {/* Arrow from comment to code line */}
      <path d="M190 66 L175 67" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Review comment bubble pointing to line 4 — green accent */}
      <rect
        x="195"
        y="82"
        width="65"
        height="24"
        rx="5"
        stroke="#22c55e"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <line x1="205" y1="94" x2="250" y2="94" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
      {/* Arrow from green comment to code line */}
      <path d="M195 94 L165 91" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
      {/* Subtle highlight on line 4 */}
      <rect x="62" y="86" width="128" height="12" rx="2" fill="#22c55e" opacity="0.05" />
    </svg>
  );
}

const useCases = [
  {
    tag: "Observability",
    title: "Database monitoring assistant",
    description:
      "AI assistant analyzes ClickHouse queries and stores diagnostic conversations for audit trails.",
    illustration: ClickHouseMonitorIllustration,
  },
  {
    tag: "Creative tools",
    title: "LLM usage tracking",
    description: "Track token usage and conversation history across stamp generation sessions.",
    illustration: StampBuilderIllustration,
  },
  {
    tag: "Customer support",
    title: "Customer support agent",
    description:
      "Persistent conversation threads so support agents remember every customer interaction.",
    illustration: SupportBotIllustration,
  },
  {
    tag: "Developer tools",
    title: "Code review assistant",
    description:
      "Store code review conversations with file references and diff context for team knowledge.",
    illustration: CodeAssistantIllustration,
  },
] as const;

export function UseCases() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 animate-fade-in-up"
      style={{ animationDelay: "0.35s" }}
    >
      <h2 className="text-lg font-medium mb-5">Use cases</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {useCases.map((useCase) => (
          <div
            key={useCase.title}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-center h-40 bg-accent/20">
              <useCase.illustration />
            </div>
            <div className="p-5">
              <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-accent text-muted-foreground mb-3">
                {useCase.tag}
              </span>
              <h3 className="text-base font-medium mb-1">{useCase.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
