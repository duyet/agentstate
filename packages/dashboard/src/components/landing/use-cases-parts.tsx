import type { ReactElement } from "react";
import {
  accentBtn,
  accentCircle,
  accentTextLine,
  bar,
  chartContainer,
  cornerNode,
  downArrow,
  frame,
  pulseRing,
  sessionNode,
  softRect,
  textLine,
  titleDots,
} from "./_use-cases-helpers";

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
      {[70, 145, 220].map((x, i) => (
        <g key={x}>{sessionNode(x, 80, i === 2)}</g>
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
      {textLine(35, 36, 285)}
      {softRect(48, 44, 58, 28)}
      {softRect(118, 44, 58, 28)}
      {softRect(188, 44, 58, 28, true, true)}
      {textLine(56, 56, 98)}
      {textLine(56, 64, 84, 0.15)}
      {textLine(126, 56, 168)}
      {textLine(126, 64, 154, 0.15)}
      {accentTextLine(196, 56, 238)}
      {accentTextLine(196, 64, 224, 0.25)}
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
      {cornerNode(30, 20, 135, 66, "top-left")}
      {cornerNode(240, 20, 185, 66, "top-right")}
      {cornerNode(30, 112, 135, 94, "bottom-left")}
      {cornerNode(240, 112, 185, 94, "bottom-right")}
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
