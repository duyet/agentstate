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
