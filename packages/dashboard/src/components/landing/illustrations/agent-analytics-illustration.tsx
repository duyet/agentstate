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
} from "../_use-cases-helpers";

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
