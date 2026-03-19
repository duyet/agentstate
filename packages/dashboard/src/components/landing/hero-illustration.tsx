"use client";

import {
  agentNode,
  agentStateDbNode,
  backgroundGrid,
  connectionPath,
  dataPackets,
  historyNode,
} from "./_hero-svg-factories";

const PATH_AGENT_TO_DB = "M210 200 Q275 160 340 200";
const PATH_DB_TO_HISTORY = "M460 200 Q525 240 590 200";

export function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        role="presentation"
        className="absolute inset-0 w-full h-full opacity-[0.08]"
        viewBox="0 0 800 400"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {backgroundGrid()}
        {agentNode()}
        {agentStateDbNode()}
        {historyNode()}
        {connectionPath(PATH_AGENT_TO_DB)}
        {connectionPath(PATH_DB_TO_HISTORY)}
        {dataPackets()}
      </svg>
    </div>
  );
}
