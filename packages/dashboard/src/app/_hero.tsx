"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { AdapterHub } from "@/components/brand/adapter-hub";
import { Pill } from "@/components/brand/bits";
import { CodeBlock } from "@/components/brand/code-block";
import { Wrap } from "./_section";

const HERO_CODE = `import { AgentState } from "@agentstate/sdk";
import { createAISDKChatStore } from "@agentstate/sdk/ai-sdk";

const state = new AgentState({ apiKey: AS_KEY });
const store = createAISDKChatStore(state);

// any framework — one persistent state layer
const chatId = await store.createChat();`;

export function Hero() {
  return (
    <section className="relative pt-16 pb-20">
      <Wrap>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="fade-up">
            <div className="mb-6 flex flex-wrap gap-2">
              <Pill>
                <span className="size-2 rounded-full bg-brand" />
                universal state layer
              </Pill>
              <Pill>cloudflare&nbsp;d1</Pill>
            </div>

            <h1 className="text-[40px] leading-[0.98] tracking-[-0.035em] sm:text-[56px]">
              One state layer
              <br />
              for every
              <br />
              <span className="relative inline-block">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 h-2 bg-brand-soft"
                />
                <span className="relative">AI&nbsp;agent</span>
              </span>
            </h1>

            <p className="mt-[22px] max-w-[460px] text-[18px] leading-[1.5] text-muted-foreground">
              Store conversations, UI messages and graph state behind one API — with drop-in
              adapters for every framework you already use. Stop rebuilding the memory backend.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/dashboard">
                <Button variant="primary">
                  Open dashboard
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline">Read the docs</Button>
              </Link>
              {/* biome-ignore lint/a11y/useAnchorContent: wrapping Button yields clickable content. */}
              <a
                href="https://github.com/duyet/agentstate"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="ghost" className="text-muted-foreground">
                  GitHub
                  <ArrowUpRight size={16} />
                </Button>
              </a>
            </div>

            <div className="mt-7 max-w-[470px]">
              <CodeBlock code={HERO_CODE} title="app.ts" dense />
            </div>
          </div>

          <div className="fade-up" style={{ animationDelay: "0.08s" }}>
            <AdapterHub />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
