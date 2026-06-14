"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { Section } from "./_section";

export function CTA() {
  return (
    <Section className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[14px] border border-zinc-900 bg-zinc-900 px-10 py-11 dark:border-zinc-800">
        <div>
          <h2 className="text-[30px] text-white">Ship the agent, not the backend.</h2>
          <p className="mt-2 text-[15.5px] text-zinc-400">
            Spin up a project, grab a key, and persist your first session in two minutes.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/dashboard">
            <Button variant="primary">
              Open dashboard
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/docs">
            <Button
              variant="outline"
              className="border-zinc-700 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-zinc-700 dark:bg-transparent"
            >
              Docs
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}
