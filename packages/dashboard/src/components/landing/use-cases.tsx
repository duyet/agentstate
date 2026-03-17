"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACCENT = "#22c55e";

function VibeChatbotIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Editor frame */}
      <rect
        x="45"
        y="15"
        width="230"
        height="130"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      {/* Title bar */}
      <circle cx="62" cy="30" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="74" cy="30" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="86" cy="30" r="3" fill="currentColor" opacity="0.2" />
      <line x1="45" y1="42" x2="275" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Natural language prompt block */}
      <rect
        x="60"
        y="54"
        width="200"
        height="32"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
        className="animate-pulse-soft"
      />
      <line x1="72" y1="65" x2="200" y2="65" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="72" y1="76" x2="172" y2="76" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {/* Arrow pointing down to API call */}
      <path
        d="M160 88 L160 102"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        opacity="0.25"
      />
      <path d="M155 100 L160 106 L165 100" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      {/* API call block */}
      <rect
        x="80"
        y="108"
        width="160"
        height="24"
        rx="5"
        stroke={ACCENT}
        strokeWidth="1.2"
        opacity="0.6"
      />
      <line x1="96" y1="120" x2="180" y2="120" stroke={ACCENT} strokeWidth="1" opacity="0.35" />
      {/* Green accent dot */}
      <circle cx="228" cy="120" r="3" fill={ACCENT} opacity="0.9" />
    </svg>
  );
}

function MultiSessionIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Horizontal timeline spine */}
      <line
        x1="40"
        y1="80"
        x2="280"
        y2="80"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      {/* Session node 1 */}
      <circle cx="70" cy="80" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="70" cy="80" r="4" fill="currentColor" opacity="0.2" />
      {/* Session node 2 */}
      <circle cx="145" cy="80" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="145" cy="80" r="4" fill="currentColor" opacity="0.2" />
      {/* Session node 3 — active, green accent */}
      <circle
        cx="220"
        cy="80"
        r="12"
        stroke={ACCENT}
        strokeWidth="1.5"
        opacity="0.7"
        className="animate-pulse-soft"
      />
      <circle cx="220" cy="80" r="4" fill={ACCENT} opacity="0.9" />
      {/* Labels above nodes */}
      <line x1="70" y1="60" x2="70" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <rect
        x="47"
        y="48"
        width="46"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      <line x1="145" y1="60" x2="145" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <rect
        x="122"
        y="48"
        width="46"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      <line x1="220" y1="60" x2="220" y2="68" stroke={ACCENT} strokeWidth="1" opacity="0.4" />
      <rect
        x="197"
        y="48"
        width="46"
        height="12"
        rx="3"
        stroke={ACCENT}
        strokeWidth="1"
        opacity="0.4"
      />
      {/* Persistent thread — dashed line below */}
      <path
        d="M70 95 Q107 120 145 95 Q182 120 220 95"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="4 3"
        opacity="0.2"
      />
      {/* Forward arrow at end */}
      <path d="M270 76 L280 80 L270 84" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
    </svg>
  );
}

function AgentAnalyticsIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Dashboard frame */}
      <rect
        x="35"
        y="15"
        width="250"
        height="130"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      {/* Top bar */}
      <line x1="35" y1="36" x2="285" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Metric counters — top row */}
      <rect
        x="48"
        y="44"
        width="58"
        height="28"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <rect
        x="118"
        y="44"
        width="58"
        height="28"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
      />
      <rect
        x="188"
        y="44"
        width="58"
        height="28"
        rx="4"
        stroke={ACCENT}
        strokeWidth="1.2"
        opacity="0.5"
        className="animate-pulse-soft"
      />
      {/* Metric lines */}
      <line x1="56" y1="56" x2="98" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="56" y1="64" x2="84" y2="64" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <line x1="126" y1="56" x2="168" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line
        x1="126"
        y1="64"
        x2="154"
        y2="64"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.15"
      />
      <line x1="196" y1="56" x2="238" y2="56" stroke={ACCENT} strokeWidth="1" opacity="0.3" />
      <line x1="196" y1="64" x2="224" y2="64" stroke={ACCENT} strokeWidth="1" opacity="0.25" />
      {/* Line chart area */}
      <rect
        x="48"
        y="82"
        width="110"
        height="50"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      <polyline
        points="56,122 72,108 88,114 104,98 120,104 136,92 150,100"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.35"
      />
      <circle cx="136" cy="92" r="2.5" fill={ACCENT} opacity="0.9" />
      {/* Bar chart area */}
      <rect
        x="170"
        y="82"
        width="100"
        height="50"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.2"
      />
      <rect
        x="180"
        y="108"
        width="12"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
      <rect
        x="198"
        y="100"
        width="12"
        height="24"
        rx="2"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
      <rect
        x="216"
        y="94"
        width="12"
        height="30"
        rx="2"
        stroke={ACCENT}
        strokeWidth="1"
        opacity="0.5"
      />
      <rect
        x="234"
        y="104"
        width="12"
        height="20"
        rx="2"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
      <rect
        x="252"
        y="97"
        width="12"
        height="27"
        rx="2"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
    </svg>
  );
}

// [rx, ry] = top-left corner of each framework node; [lx1,ly1,lx2,ly2] = connector line to hub
const FRAMEWORK_NODES = [
  { rx: 30, ry: 20, lx1: 80, ly1: 34, lx2: 141, ly2: 66 },
  { rx: 240, ry: 20, lx1: 240, ly1: 34, lx2: 179, ly2: 66 },
  { rx: 30, ry: 112, lx1: 80, ly1: 126, lx2: 141, ly2: 94 },
  { rx: 240, ry: 112, lx1: 240, ly1: 126, lx2: 179, ly2: 94 },
] as const;

function UniversalFrameworkIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {/* Central API hub */}
      <circle cx="160" cy="80" r="22" stroke={ACCENT} strokeWidth="1.5" opacity="0.7" />
      <circle
        cx="160"
        cy="80"
        r="14"
        stroke={ACCENT}
        strokeWidth="1.2"
        opacity="0.4"
        className="animate-pulse-soft"
      />
      <circle cx="160" cy="80" r="4" fill={ACCENT} opacity="0.9" />
      {/* Framework nodes */}
      {FRAMEWORK_NODES.map(({ rx, ry, lx1, ly1, lx2, ly2 }) => (
        <g key={`${rx}-${ry}`}>
          <rect
            x={rx}
            y={ry}
            width="50"
            height="28"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <line
            x1={rx + 8}
            y1={ry + 10}
            x2={rx + 42}
            y2={ry + 10}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.2"
          />
          <line
            x1={rx + 8}
            y1={ry + 20}
            x2={rx + 32}
            y2={ry + 20}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.15"
          />
          <line
            x1={lx1}
            y1={ly1}
            x2={lx2}
            y2={ly2}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.2"
          />
        </g>
      ))}
    </svg>
  );
}

const useCases = [
  {
    tag: "Vibe coding",
    title: "Vibe-coded chatbot",
    description:
      "Tell your coding agent to add conversation history. No database setup, no ORM config — just an API call.",
    illustration: VibeChatbotIllustration,
  },
  {
    tag: "Persistent memory",
    title: "Multi-session agent",
    description:
      "Your agent picks up where it left off. Full conversation threads survive restarts, deploys, and scaling.",
    illustration: MultiSessionIllustration,
  },
  {
    tag: "Observability",
    title: "Agent analytics",
    description:
      "Track token usage, conversation volume, and agent behavior across all sessions. Built-in audit trails.",
    illustration: AgentAnalyticsIllustration,
  },
  {
    tag: "Universal",
    title: "Any framework, any language",
    description:
      "Works with LangGraph, Vercel AI SDK, Cloudflare Agents, or a plain curl command. REST API, zero vendor lock-in.",
    illustration: UniversalFrameworkIllustration,
  },
] as const;

export function UseCases() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 space-y-6 animate-fade-in-up"
      style={{ animationDelay: "0.35s" }}
    >
      <h2 className="text-lg font-medium">Use cases</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {useCases.map((useCase) => (
          <Card key={useCase.title}>
            <div className="flex items-center justify-center h-40 bg-accent/20">
              <useCase.illustration />
            </div>
            <CardHeader>
              <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-accent text-muted-foreground mb-2">
                {useCase.tag}
              </span>
              <CardTitle>{useCase.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
