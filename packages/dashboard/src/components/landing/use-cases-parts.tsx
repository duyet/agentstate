import type { ReactElement } from "react";

const ACCENT = "#22c55e";

// Prefixed factories return full JSX elements
const frame = (x: number, y: number, w: number, h: number, rx = 8) => (
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

const titleDots = () => (
  <>
    <circle cx={62} cy={30} r={3} fill="currentColor" opacity={0.2} />
    <circle cx={74} cy={30} r={3} fill="currentColor" opacity={0.2} />
    <circle cx={86} cy={30} r={3} fill="currentColor" opacity={0.2} />
  </>
);

const textLine = (x1: number, y: number, x2: number, opacity = 0.2) => (
  <line x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth={1} opacity={opacity} />
);

export function VibeChatbotIllustration(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {frame(45, 15, 230, 130)}
      {titleDots()}
      <line x1={45} y1={42} x2={275} y2={42} stroke="currentColor" strokeWidth={1} opacity={0.2} />
      <rect
        x={60}
        y={54}
        width={200}
        height={32}
        rx={5}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.25}
        className="animate-pulse-soft"
      />
      {textLine(72, 65, 200)}
      {textLine(72, 76, 172, 0.15)}
      <path
        d="M160 88 L160 102"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeDasharray="3 2"
        opacity={0.25}
      />
      <path d="M155 100 L160 106 L165 100" stroke="currentColor" strokeWidth={1.2} opacity={0.25} />
      <rect
        x={80}
        y={108}
        width={160}
        height={24}
        rx={5}
        stroke={ACCENT}
        strokeWidth={1.2}
        opacity={0.6}
      />
      <line x1={96} y1={120} x2={180} y2={120} stroke={ACCENT} strokeWidth={1} opacity={0.35} />
      <circle cx={228} cy={120} r={3} fill={ACCENT} opacity={0.9} />
    </svg>
  );
}

export function MultiSessionIllustration(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      <line
        x1={40}
        y1={80}
        x2={280}
        y2={80}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.2}
      />
      {[70, 145, 220].map((x, i) => (
        <g key={x}>
          <circle
            cx={x}
            cy={80}
            r={12}
            stroke={i === 2 ? ACCENT : "currentColor"}
            strokeWidth={1.5}
            opacity={i === 2 ? 0.7 : 0.3}
          />
          <circle
            cx={x}
            cy={80}
            r={4}
            fill={i === 2 ? ACCENT : "currentColor"}
            opacity={i === 2 ? 0.9 : 0.2}
          />
          <line
            x1={x}
            y1={60}
            x2={x}
            y2={68}
            stroke={i === 2 ? ACCENT : "currentColor"}
            strokeWidth={1}
            opacity={i === 2 ? 0.4 : 0.2}
          />
          <rect
            x={x - 23}
            y={48}
            width={46}
            height={12}
            rx={3}
            stroke={i === 2 ? ACCENT : "currentColor"}
            strokeWidth={1}
            opacity={i === 2 ? 0.4 : 0.2}
          />
        </g>
      ))}
      <path
        d="M70 95 Q107 120 145 95 Q182 120 220 95"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeDasharray="4 3"
        opacity={0.2}
      />
      <path d="M270 76 L280 80 L270 84" stroke="currentColor" strokeWidth={1.2} opacity={0.2} />
    </svg>
  );
}

export function AgentAnalyticsIllustration(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {frame(35, 15, 250, 130)}
      <line x1={35} y1={36} x2={285} y2={36} stroke="currentColor" strokeWidth={1} opacity={0.2} />
      {[48, 118, 188].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={44}
          width={58}
          height={28}
          rx={4}
          stroke={i === 2 ? ACCENT : "currentColor"}
          strokeWidth={1.2}
          opacity={i === 2 ? 0.5 : 0.25}
          className={i === 2 ? "animate-pulse-soft" : undefined}
        />
      ))}
      {textLine(56, 56, 98)}
      {textLine(56, 64, 84, 0.15)}
      {textLine(126, 56, 168)}
      {textLine(126, 64, 154, 0.15)}
      <line x1={196} y1={56} x2={238} y2={56} stroke={ACCENT} strokeWidth={1} opacity={0.3} />
      <line x1={196} y1={64} x2={224} y2={64} stroke={ACCENT} strokeWidth={1} opacity={0.25} />
      <rect
        x={48}
        y={82}
        width={110}
        height={50}
        rx={4}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.2}
      />
      <polyline
        points="56,122 72,108 88,114 104,98 120,104 136,92 150,100"
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.35}
      />
      <circle cx={136} cy={92} r={2.5} fill={ACCENT} opacity={0.9} />
      <rect
        x={170}
        y={82}
        width={100}
        height={50}
        rx={4}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.2}
      />
      {[180, 198, 216, 234].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={i === 2 ? 94 : i === 0 ? 108 : 100}
          width={12}
          height={i === 2 ? 30 : i === 0 ? 16 : 24}
          rx={2}
          stroke={i === 2 ? ACCENT : "currentColor"}
          strokeWidth={1}
          opacity={i === 2 ? 0.5 : 0.25}
        />
      ))}
      <rect
        x={252}
        y={97}
        width={12}
        height={27}
        rx={2}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.2}
      />
    </svg>
  );
}

const FRAMEWORK_NODES = [
  { rx: 30, ry: 20, lx1: 80, ly1: 34, lx2: 141, ly2: 66 },
  { rx: 240, ry: 20, lx1: 240, ly1: 34, lx2: 179, ly2: 66 },
  { rx: 30, ry: 112, lx1: 80, ly1: 126, lx2: 141, ly2: 94 },
  { rx: 240, ry: 112, lx1: 240, ly1: 126, lx2: 179, ly2: 94 },
] as const;

export function UniversalFrameworkIllustration(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      <circle cx={160} cy={80} r={22} stroke={ACCENT} strokeWidth={1.5} opacity={0.7} />
      <circle
        cx={160}
        cy={80}
        r={14}
        stroke={ACCENT}
        strokeWidth={1.2}
        opacity={0.4}
        className="animate-pulse-soft"
      />
      <circle cx={160} cy={80} r={4} fill={ACCENT} opacity={0.9} />
      {FRAMEWORK_NODES.map(({ rx, ry, lx1, ly1, lx2, ly2 }) => (
        <g key={`${rx}-${ry}`}>
          <rect
            x={rx}
            y={ry}
            width={50}
            height={28}
            rx={5}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.3}
          />
          <line
            x1={rx + 8}
            y1={ry + 10}
            x2={rx + 42}
            y2={ry + 10}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.2}
          />
          <line
            x1={rx + 8}
            y1={ry + 20}
            x2={rx + 32}
            y2={ry + 20}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.15}
          />
          <line
            x1={lx1}
            y1={ly1}
            x2={lx2}
            y2={ly2}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.2}
          />
        </g>
      ))}
    </svg>
  );
}

export type UseCaseItem = {
  tag: string;
  title: string;
  description: string;
  illustration: () => ReactElement;
};

export const useCases = [
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
