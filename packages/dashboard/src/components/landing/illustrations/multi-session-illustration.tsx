import type { ReactElement } from "react";
import { sessionNode } from "../_use-cases-helpers";

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
