"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { Tag } from "@/components/brand/bits";
import { Section } from "./_section";

const STEPS = [
  {
    n: "01",
    kicker: "INGEST",
    title: "Append turns",
    code: "store.saveChat({ chatId, messages })",
  },
  { n: "02", kicker: "STORE", title: "Edge persistence", code: "// D1 · SHA-256 keys · scoped" },
  { n: "03", kicker: "RETRIEVE", title: "Resume anywhere", code: "await store.loadChat(chatId)" },
];

function Step({
  n,
  kicker,
  title,
  code,
}: {
  n: string;
  kicker: string;
  title: string;
  code: string;
}) {
  return (
    <div className="rounded-[9px] border border-border bg-card p-[18px] shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[22px] font-semibold text-border">{n}</span>
        <Tag className="text-brand-ink">{kicker}</Tag>
      </div>
      <div className="mb-2.5 font-display text-base font-semibold">{title}</div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-line-soft bg-background px-2.5 py-[7px] font-mono text-[11.5px] text-ink-2">
        {code}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center text-faint max-md:rotate-90">
      <ArrowRight size={20} aria-hidden="true" />
    </div>
  );
}

export function Loop() {
  return (
    <Section>
      <h2 className="text-[26px]">The loop</h2>
      <p className="mt-1.5 mb-6 text-muted-foreground">
        Three calls. Persisted, retrievable, analyzable across every session.
      </p>
      <div className="dot-grid rounded-[14px] border border-border bg-card px-7 py-[34px] shadow-sm">
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Step {...STEPS[0]} />
          <Arrow />
          <Step {...STEPS[1]} />
          <Arrow />
          <Step {...STEPS[2]} />
        </div>
      </div>
    </Section>
  );
}
