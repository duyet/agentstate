"use client";

import { ArrowCounterClockwise, Key } from "@phosphor-icons/react";
import { type ReactNode, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectScope } from "@/components/project-scope";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearDebugKey, getDebugKey, maskKey, setDebugKey } from "@/lib/scoped-api";

/**
 * Gate for the coordination-primitive pages (States, Leases, Claims,
 * Capability Tokens). Those endpoints authenticate with a Bearer API
 * key (scopedAuth), not the Clerk session, so each page needs the
 * user to connect a project key first. The key is stored in
 * localStorage per project and never leaves the browser except as
 * an Authorization header to the same-origin API.
 */
export function ScopedKeyGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (connectedKey: string) => ReactNode;
}) {
  const { selectedProject, projects, loadingProjects } = useProjectScope();
  // Derived from storage on every render (not state): the
  // connected key must always belong to the selected project,
  // and state updated in an effect would briefly pair the new
  // project with the previous project's key — every scoped
  // call from that render would be rejected. Mutations write
  // storage and bump `renderTick` to re-render.
  const connectedKey = selectedProject ? getDebugKey(selectedProject.id) : null;
  const [, setRenderTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset the connect form when the project changes. Render-phase
  // reset (React's "store the previous value in a ref" pattern) so
  // the stale draft/error never flashes for the new project.
  const lastProjectId = useRef<string | null>(null);
  if (selectedProject?.id !== lastProjectId.current) {
    lastProjectId.current = selectedProject?.id ?? null;
    setDraft("");
    setError(null);
  }

  if (!selectedProject) {
    return (
      <div className="page-wrap">
        <PageHeader title={title} description={description} />
        <Card className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
              <Key className="size-6" aria-hidden />
            </div>
            <div className="flex max-w-xs flex-col gap-1">
              <p className="text-[14px] font-medium text-fg">
                {loadingProjects ? "Loading projects…" : "No project selected"}
              </p>
              <p className="text-[12.5px] leading-5 text-fg-4">
                Create a project first, then connect an API key to browse its coordination
                primitives.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!connectedKey) {
    return (
      <div className="page-wrap">
        <PageHeader title={title} description={description} />
        <Card className="max-w-xl">
          <form
            className="flex flex-col gap-component"
            onSubmit={(e) => {
              e.preventDefault();
              const key = draft.trim();
              if (!key) {
                setError("Paste an API key to continue");
                return;
              }
              if (!/^(as_live_|as_cap_)/.test(key)) {
                setError("Keys start with as_live_ (API key) or as_cap_ (capability token)");
                return;
              }
              setDebugKey(selectedProject.id, key);
              setRenderTick((tick) => tick + 1);
              setDraft("");
              setError(null);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[15px] text-fg">Connect an API key</h2>
              <p className="text-[13px] leading-5 text-fg-3">
                {title} authenticate with a Bearer key, not your dashboard session. Paste a project
                key from{" "}
                <a
                  href="/dashboard/keys/"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  API Keys
                </a>{" "}
                (revealed once at creation) or your environment. It is stored in this browser only,
                for project <code className="font-mono text-fg-2">{selectedProject.slug}</code>.
              </p>
            </div>
            <Input
              type="password"
              mono
              placeholder="as_live_…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="API key"
              error={error ?? undefined}
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="sm">
                Connect key
              </Button>
              {projects.length > 1 && (
                <span className="text-[12px] text-fg-4">
                  stored per project · {projects.length} projects
                </span>
              )}
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-edge bg-panel px-3 py-2 font-mono text-[12px] text-fg-3">
        <Key size={13} aria-hidden="true" />
        <span>
          connected as <span className="text-fg-2">{maskKey(connectedKey)}</span>
        </span>
        <span className="text-fg-4">·</span>
        <span>{selectedProject.name}</span>
        <button
          type="button"
          onClick={() => {
            clearDebugKey(selectedProject.id);
            setRenderTick((tick) => tick + 1);
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-none px-1.5 py-0.5 text-fg-4 transition-colors hover:bg-panel2 hover:text-fg"
        >
          <ArrowCounterClockwise size={12} aria-hidden="true" />
          change key
        </button>
      </div>
      {children(connectedKey)}
    </>
  );
}

/**
 * Wraps a coordination-primitive page in the standard Providers +
 * AppShell + ScopedKeyGate stack, matching the other dashboard pages.
 */
export function ScopedResourcePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (connectedKey: string) => ReactNode;
}) {
  return (
    <Providers>
      <AppShell>
        <ScopedKeyGate title={title} description={description}>
          {children}
        </ScopedKeyGate>
      </AppShell>
    </Providers>
  );
}
