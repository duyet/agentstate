"use client";

import type { IconProps } from "@phosphor-icons/react";
import { ChartLineUp, Database, ShieldCheck, SquaresFour } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Tag } from "@/components/brand/bits";
import { Section } from "./_section";

const PRIMITIVES: {
  icon: (props: IconProps) => ReactNode;
  ky: string;
  name: string;
  body: string;
}[] = [
  {
    icon: Database,
    ky: "STATE",
    name: "Any state",
    body: "Threads, UI messages, RSC payloads, graph checkpoints — stored as typed v2 state under any key.",
  },
  {
    icon: SquaresFour,
    ky: "ADAPT",
    name: "Drop-in adapters",
    body: "First-class stores for AI SDK, TanStack, LangGraph & Cloudflare Agents. Or hit raw REST.",
  },
  {
    icon: ChartLineUp,
    ky: "OPS",
    name: "Usage analytics",
    body: "Conversation volume, tokens, cost and active projects — tracked per key, queryable.",
  },
  {
    icon: ShieldCheck,
    ky: "AUTH",
    name: "Key security",
    body: "SHA-256 hashed bearer keys, project scoping, rotation and audit-ready request tracing.",
  },
];

export function Primitives() {
  return (
    <Section>
      <h2 className="text-[26px]">Operations snapshot</h2>
      <p className="mt-1.5 mb-6 text-muted-foreground">
        The primitives an agent product needs once the first session lands in production.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PRIMITIVES.map((p) => (
          <div key={p.ky} className="rounded-[9px] border border-border bg-card p-[18px] shadow-sm">
            <div className="mb-3.5 flex items-center justify-between">
              <p.icon size={20} className="text-foreground" aria-hidden="true" />
              <Tag>{p.ky}</Tag>
            </div>
            <div className="mb-1.5 font-display text-base font-semibold">{p.name}</div>
            <p className="text-[13.5px] leading-[1.5] text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
