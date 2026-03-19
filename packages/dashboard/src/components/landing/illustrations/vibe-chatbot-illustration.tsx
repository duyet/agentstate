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
