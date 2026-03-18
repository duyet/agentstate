import type { ReactElement } from "react";

const ACCENT = "#22c55e";

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

const dashedLine = (x1: number, y1: number, x2: number, y2: number, opacity = 0.2) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke="currentColor"
    strokeWidth={1.2}
    strokeDasharray="4 3"
    opacity={opacity}
  />
);

const softRect = (x: number, y: number, w: number, h: number, accent = false, pulse = false) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={5}
    stroke={accent ? ACCENT : "currentColor"}
    strokeWidth={1.2}
    opacity={accent ? 0.5 : 0.25}
    className={pulse ? "animate-pulse-soft" : undefined}
  />
);

const accentCircle = (cx: number, cy: number, r: number, fill = true) => (
  <circle
    cx={cx}
    cy={cy}
    r={r}
    fill={fill ? ACCENT : "none"}
    stroke={ACCENT}
    strokeWidth={fill ? 0 : 1.5}
    opacity={0.9}
  />
);

const downArrow = (x: number, y1: number, y2: number, opacity = 0.25) => (
  <g opacity={opacity}>
    <path
      d={`M${x} ${y1} L${x} ${y2}`}
      stroke="currentColor"
      strokeWidth={1.2}
      strokeDasharray="3 2"
    />
    <path
      d={`M${x - 5} ${y2 - 2} L${x} ${y2 + 6} L${x + 5} ${y2 - 2}`}
      stroke="currentColor"
      strokeWidth={1.2}
    />
  </g>
);

const accentBtn = (x: number, y: number, w: number, h: number, textW: number) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={5} stroke={ACCENT} strokeWidth={1.2} opacity={0.6} />
    <line
      x1={x + 16}
      y1={y + 12}
      x2={x + textW}
      y2={y + 12}
      stroke={ACCENT}
      strokeWidth={1}
      opacity={0.35}
    />
  </g>
);

const chartContainer = (x: number, y: number, w: number, h: number) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={4}
    stroke="currentColor"
    strokeWidth={1.2}
    opacity={0.2}
  />
);

const bar = (x: number, y: number, h: number, accent = false) => (
  <rect
    x={x}
    y={y}
    width={12}
    height={h}
    rx={2}
    stroke={accent ? ACCENT : "currentColor"}
    strokeWidth={1}
    opacity={accent ? 0.5 : 0.25}
  />
);

const pulseRing = (cx: number, cy: number, r: number, innerR = 0) => (
  <g>
    <circle cx={cx} cy={cy} r={r} stroke={ACCENT} strokeWidth={1.5} opacity={0.7} />
    {innerR > 0 && (
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        stroke={ACCENT}
        strokeWidth={1.2}
        opacity={0.4}
        className="animate-pulse-soft"
      />
    )}
  </g>
);

const nodeLabel = (x: number, y: number, accent = false) => (
  <g>
    <rect
      x={x}
      y={y}
      width={50}
      height={28}
      rx={5}
      stroke={accent ? ACCENT : "currentColor"}
      strokeWidth={1.2}
      opacity={0.3}
    />
    {textLine(x + 8, y + 10, x + 42)}
    {textLine(x + 8, y + 20, x + 32, 0.15)}
  </g>
);

export function VibeChatbotIllustration(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {frame(45, 15, 230, 130)}
      {titleDots()}
      {textLine(45, 42, 275)}
      {softRect(60, 54, 200, 32, false, true)}
      {textLine(72, 65, 200)}
      {textLine(72, 76, 172, 0.15)}
      {downArrow(160, 88, 102)}
      {accentBtn(80, 108, 160, 24, 100)}
      {accentCircle(228, 120, 3)}
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
      {[70, 145, 220].map((x, i) => {
        const accent = i === 2;
        return (
          <g key={x}>
            <circle
              cx={x}
              cy={80}
              r={12}
              stroke={accent ? ACCENT : "currentColor"}
              strokeWidth={1.5}
              opacity={accent ? 0.7 : 0.3}
            />
            <circle
              cx={x}
              cy={80}
              r={4}
              fill={accent ? ACCENT : "currentColor"}
              opacity={accent ? 0.9 : 0.2}
            />
            <line
              x1={x}
              y1={60}
              x2={x}
              y2={68}
              stroke={accent ? ACCENT : "currentColor"}
              strokeWidth={1}
              opacity={accent ? 0.4 : 0.2}
            />
            <rect
              x={x - 23}
              y={48}
              width={46}
              height={12}
              rx={3}
              stroke={accent ? ACCENT : "currentColor"}
              strokeWidth={1}
              opacity={accent ? 0.4 : 0.2}
            />
          </g>
        );
      })}
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
      {textLine(35, 36, 285)}
      {softRect(48, 44, 58, 28)}
      {softRect(118, 44, 58, 28)}
      {softRect(188, 44, 58, 28, true, true)}
      {textLine(56, 56, 98)}
      {textLine(56, 64, 84, 0.15)}
      {textLine(126, 56, 168)}
      {textLine(126, 64, 154, 0.15)}
      <line x1={196} y1={56} x2={238} y2={56} stroke={ACCENT} strokeWidth={1} opacity={0.3} />
      <line x1={196} y1={64} x2={224} y2={64} stroke={ACCENT} strokeWidth={1} opacity={0.25} />
      {chartContainer(48, 82, 110, 50)}
      <polyline
        points="56,122 72,108 88,114 104,98 120,104 136,92 150,100"
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.35}
      />
      {accentCircle(136, 92, 2.5)}
      {chartContainer(170, 82, 100, 50)}
      {bar(180, 108, 16)}
      {bar(198, 100, 24)}
      {bar(216, 94, 30, true)}
      {bar(234, 100, 24)}
      {bar(252, 97, 27)}
    </svg>
  );
}

export function UniversalFrameworkIllustration(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 160" fill="none" className="w-full h-full">
      {pulseRing(160, 80, 22, 14)}
      {accentCircle(160, 80, 4)}
      <g key="top-left">
        {nodeLabel(30, 20)}
        {dashedLine(54, 34, 135, 66)}
      </g>
      <g key="top-right">
        {nodeLabel(240, 20)}
        {dashedLine(264, 34, 185, 66)}
      </g>
      <g key="bottom-left">
        {nodeLabel(30, 112)}
        {dashedLine(54, 126, 135, 94)}
      </g>
      <g key="bottom-right">
        {nodeLabel(240, 112)}
        {dashedLine(264, 126, 185, 94)}
      </g>
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
