"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { ArrowRight, ArrowUpRight, CaretRight, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/app/_header";
import { MethodTag } from "@/components/brand/bits";
import { CodeBlock } from "@/components/brand/code-block";
import { FRAMEWORKS, FwGlyph } from "@/components/brand/frameworks";
import { Footer } from "@/components/footer";
import { DocsNav } from "./_DocsNav";
import {
  ADAPTER_CODE,
  ANALYTICS_ENDPOINTS,
  AUTH_CODE,
  CONVERSATION_ENDPOINTS,
  QUICK_CODE,
} from "./_docs-data";
import { OnThisPage } from "./_OnThisPage";

function DocH({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 className="mt-10 mb-1 scroll-mt-[90px] text-[22px]" id={id}>
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-2.5 text-[15px] leading-[1.65] text-ink-2">{children}</p>;
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3.5 flex gap-2.5 rounded-lg border border-brand-line bg-brand-soft px-3.5 py-3">
      <ShieldCheck aria-hidden="true" size={17} className="mt-px flex-shrink-0 text-brand-ink" />
      <span className="text-[13.5px] leading-[1.5] text-ink-2">{children}</span>
    </div>
  );
}

function EndpointList({ rows }: { rows: [method: string, path: string][] }) {
  return (
    <div className="mt-3.5 overflow-hidden rounded-[9px] border border-border bg-card shadow-sm">
      {rows.map(([method, path], i) => (
        <div
          className="flex items-center gap-3.5 px-3.5 py-2.5"
          key={path + method}
          style={{
            borderBottom: i < rows.length - 1 ? "1px solid var(--line-soft)" : undefined,
          }}
        >
          <MethodTag className="min-w-[58px]">{method}</MethodTag>
          <span className="font-mono text-[12.5px] text-foreground">{path}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl items-start gap-9 px-6 py-10 pb-24 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_180px]">
          <DocsNav />

          <article className="min-w-0 max-w-[680px]">
            <div className="mb-4 flex items-center gap-2">
              <span className="font-mono text-[12px] text-faint">Docs</span>
              <CaretRight aria-hidden="true" size={13} className="text-faint" />
              <span className="font-mono text-[12px] text-muted-foreground">Getting started</span>
            </div>

            <h1 className="scroll-mt-[90px] text-[36px] tracking-[-0.03em]" id="overview">
              Persist agent state in two minutes
            </h1>
            <p className="mt-[14px] text-[17px] leading-[1.6] text-muted-foreground">
              AgentState is a state layer for AI agents. Store conversations, UI messages and graph
              checkpoints behind one REST API, then resume them from any runtime with a drop-in
              adapter.
            </p>

            <div className="mt-6 mb-2 flex flex-wrap gap-2.5">
              {/* biome-ignore lint/a11y/useAnchorContent: wrapping Button yields clickable content. */}
              <a href="https://github.com/duyet/agentstate" target="_blank" rel="noreferrer">
                <Button variant="primary">
                  GitHub
                  <ArrowUpRight size={16} />
                </Button>
              </a>
              <Link href="/dashboard">
                <Button variant="outline">Open dashboard</Button>
              </Link>
            </div>

            <DocH id="quickstart">Quickstart</DocH>
            <P>
              Install the SDK, create a project key in the dashboard, and store your first
              conversation.
            </P>
            <CodeBlock className="mt-3.5" code={QUICK_CODE} title="quickstart.ts" />

            <DocH id="auth">Authentication</DocH>
            <P>
              Every request is authenticated with a project-scoped bearer key. Keys are SHA-256
              hashed at rest and can be rotated or revoked from the dashboard.
            </P>
            <CodeBlock className="mt-3.5" code={AUTH_CODE} title="auth.sh" />
            <Callout>
              Keys begin with <code className="font-mono text-brand-ink">as_live_</code> and scope
              to a single project. Never ship them client-side.
            </Callout>

            <DocH id="conversations">Conversations</DocH>
            <P>
              The core resource. Create with optional messages, append turns, then retrieve the full
              thread later with <code className="font-mono text-brand-ink">?include=messages</code>.
            </P>
            <EndpointList rows={CONVERSATION_ENDPOINTS} />

            <DocH id="ai-sdk">Adapters</DocH>
            <P>
              Skip the wiring. Adapters map your framework&apos;s native state shape onto AgentState
              v2 state — the same store powers Vercel AI SDK, TanStack, LangGraph and Cloudflare
              Agents.
            </P>
            <CodeBlock className="mt-3.5" code={ADAPTER_CODE} title="ai-sdk.ts" />
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FRAMEWORKS.slice(0, 4).map((f) => (
                <Surface
                  className="flex flex-row items-center gap-[11px] px-[13px] py-[13px]"
                  key={f.id}
                >
                  <FwGlyph kind={f.glyph} size={18} />
                  <div>
                    <div className="text-[13.5px] font-semibold">{f.name}</div>
                    <div className="font-mono text-[10.5px] text-faint">{f.tag}</div>
                  </div>
                </Surface>
              ))}
            </div>

            <DocH id="analytics">Analytics</DocH>
            <P>
              Usage is tracked per key. Query summaries and time-series for conversations, messages,
              tokens and cost.
            </P>
            <EndpointList rows={ANALYTICS_ENDPOINTS} />

            <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
              <Link href="/">
                <Button className="text-muted-foreground" size="sm" variant="ghost">
                  <ArrowRight size={16} />
                  Home
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="sm" variant="outline">
                  Dashboard
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </article>

          <OnThisPage />
        </div>
      </main>

      <Footer />
    </div>
  );
}
