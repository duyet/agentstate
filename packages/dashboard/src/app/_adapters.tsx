"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { FRAMEWORKS, FwGlyph } from "@/components/brand/frameworks";
import { Section } from "./_section";

export function Adapters() {
  return (
    <Section>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[26px]">Drop-in adapters</h2>
          <p className="mt-1.5 text-muted-foreground">
            Wire AgentState into your runtime in one import — or skip the SDK entirely.
          </p>
        </div>
        <Link href="/dashboard">
          <Button size="sm" variant="outline">
            Try in dashboard
            <ArrowRight size={16} />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {FRAMEWORKS.map((f) => (
          <div
            key={f.id}
            className="flex flex-col gap-3 rounded-[9px] border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground"
          >
            <div className="flex size-[38px] items-center justify-center rounded-lg border border-border bg-background">
              <FwGlyph kind={f.glyph} size={19} />
            </div>
            <div>
              <div className="font-display text-[15px] font-semibold">{f.name}</div>
              <div className="mt-[3px] font-mono text-[11.5px] text-muted-foreground">{f.tag}</div>
            </div>
          </div>
        ))}
        <div className="flex flex-col justify-center gap-1.5 rounded-[9px] border border-dashed border-border bg-bg-deep p-4">
          <div className="font-display text-[15px] font-semibold">+ your stack</div>
          <div className="font-mono text-[11.5px] text-muted-foreground">adapter spec</div>
        </div>
      </div>
    </Section>
  );
}
