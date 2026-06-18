import type { ConversationResponse, TraceDetailResponse } from "@agentstate/shared";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { _EmptyProjects } from "@/components/dashboard/conversations/_components";
import { useProjectScope } from "@/components/project-scope";
import { Providers } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TraceItem = Pick<
  ConversationResponse,
  "id" | "title" | "message_count" | "total_tokens" | "total_cost_microdollars" | "created_at"
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Stable keys for loading skeletons (avoids array-index keys).
const ROW_SKEL = ["row-skel-1", "row-skel-2", "row-skel-3", "row-skel-4", "row-skel-5"] as const;
const DETAIL_SKEL = ["detail-skel-1", "detail-skel-2", "detail-skel-3", "detail-skel-4"] as const;

function formatCost(microdollars: number): string {
  if (microdollars === 0) return "-";
  const dollars = microdollars / 1_000_000;
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens === 0) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

function formatDuration(startTime: number | null, endTime: number | null): string {
  if (!startTime || !endTime) return "-";
  const ms = endTime - startTime;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// PageHeader (matches conversations layout)
// ---------------------------------------------------------------------------

function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-[22px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-[26px] tracking-tight text-fg">{title}</h1>
        <p className="text-[14.5px] leading-6 text-fg-3">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Observation waterfall
// ---------------------------------------------------------------------------

// Badge tones per observation type (mapped to the design-system token palette).
const TYPE_TONE: Record<string, "default" | "live" | "warn" | "idle"> = {
  generation: "live",
  tool: "warn",
  agent: "live",
  chain: "warn",
  span: "idle",
  event: "warn",
};

// Bar fill per observation type — single accent + functional tokens only.
const BAR_COLOR: Record<string, string> = {
  generation: "bg-accent",
  tool: "bg-warn",
  agent: "bg-accent",
  chain: "bg-pos",
  span: "bg-fg-4",
  event: "bg-warn",
};

function ObservationRow({
  obs,
  depth,
  traceStart,
  traceDuration,
}: {
  obs: TraceDetailResponse["observations"][number];
  depth: number;
  traceStart: number;
  traceDuration: number;
}) {
  const type = obs.observation_type ?? "span";
  const duration = obs.start_time && obs.end_time ? obs.end_time - obs.start_time : 0;
  const barWidth =
    traceDuration > 0 && duration > 0 ? Math.max(2, (duration / traceDuration) * 100) : 0;
  const barOffset =
    traceDuration > 0 && obs.start_time ? ((obs.start_time - traceStart) / traceDuration) * 100 : 0;

  return (
    <>
      <div
        className="flex items-center gap-2 border-b border-edge-soft py-1.5 pr-3 text-[12px] text-fg-3"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <Badge tone={TYPE_TONE[type] ?? "idle"} className="shrink-0">
          {type}
        </Badge>
        <span className="max-w-[140px] truncate text-fg-3">{obs.model ?? obs.role}</span>
        <span className="flex-1" />
        <div className="relative h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-panel2">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${BAR_COLOR[type] ?? BAR_COLOR.span}`}
            style={{
              width: `${Math.min(barWidth, 100)}%`,
              marginLeft: `${Math.min(barOffset, 100)}%`,
            }}
          />
        </div>
        <span className="num w-12 text-right text-fg-3">
          {obs.start_time && obs.end_time ? formatDuration(obs.start_time, obs.end_time) : "-"}
        </span>
        <span className="num w-14 text-right text-fg-3">{formatTokens(obs.token_count)}</span>
        <span className="num w-14 text-right text-fg-3">
          {formatCost(obs.cost_microdollars ?? 0)}
        </span>
      </div>
      {obs.children?.map((child) => (
        <ObservationRow
          key={child.id}
          obs={child}
          depth={depth + 1}
          traceStart={traceStart}
          traceDuration={traceDuration}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mono uppercase column header label
// ---------------------------------------------------------------------------

function ColLabel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-4 ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Trace content (uses useSearchParams, must be inside Suspense)
// ---------------------------------------------------------------------------

function TracesContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  // The active project comes from the sidebar-driven global scope.
  const { projects, selectedProjectId, loadingProjects } = useProjectScope();

  // Trace list
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    setTraces([]);
    setHasMore(false);
    api<{ data: TraceItem[]; has_more: boolean }>(
      `/v1/projects/${selectedProjectId}/traces?limit=50`,
    )
      .then((res) => {
        setTraces(res.data);
        setHasMore(res.has_more);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load traces"))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || traces.length === 0 || !selectedProjectId) return;
    const cursor = traces[traces.length - 1].created_at.toString();
    setLoadingMore(true);
    api<{ data: TraceItem[]; has_more: boolean }>(
      `/v1/projects/${selectedProjectId}/traces?limit=50&cursor=${cursor}`,
    )
      .then((res) => {
        setTraces((prev) => [...prev, ...res.data]);
        setHasMore(res.has_more);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load more"))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, traces, selectedProjectId]);

  // Trace detail
  const [detail, setDetail] = useState<TraceDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedId || !selectedProjectId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    api<TraceDetailResponse>(`/v1/projects/${selectedProjectId}/traces/${selectedId}`)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load trace detail"))
      .finally(() => setLoadingDetail(false));
  }, [selectedId, selectedProjectId]);

  // Compute trace timeline bounds for waterfall bars
  const observations = detail?.observations ?? [];
  const traceStart =
    observations.length > 0
      ? observations.reduce((min, o) => Math.min(min, o.start_time ?? Infinity), Infinity)
      : 0;
  const traceEnd =
    observations.length > 0
      ? observations.reduce((max, o) => Math.max(max, o.end_time ?? -Infinity), -Infinity)
      : 0;
  const traceDuration = traceEnd > traceStart ? traceEnd - traceStart : 0;

  const handleCreateProject = useCallback(() => window.location.assign("/dashboard"), []);

  return (
    <div className="px-5 sm:px-7">
      <PageHeader title="Traces" description="LLM execution traces and observability." />

      {loadingProjects && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-edge bg-panel p-4"
            >
              <div className="size-10 shrink-0 animate-pulse rounded-[var(--radius)] bg-edge" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-edge" />
                <div className="h-3 w-24 animate-pulse rounded bg-edge" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingProjects && projects.length === 0 && (
        <_EmptyProjects onCreateProject={handleCreateProject} />
      )}

      {!loadingProjects && projects.length > 0 && (
        <>
          {/* Traces table */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-edge bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="w-[40%] px-3 py-2 text-left">
                      <ColLabel>Title</ColLabel>
                    </th>
                    <th className="px-3 py-2 text-left">
                      <ColLabel>Observations</ColLabel>
                    </th>
                    <th className="px-3 py-2 text-left">
                      <ColLabel>Tokens</ColLabel>
                    </th>
                    <th className="px-3 py-2 text-left">
                      <ColLabel>Cost</ColLabel>
                    </th>
                    <th className="px-3 py-2 text-left">
                      <ColLabel>Created</ColLabel>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    ROW_SKEL.map((k) => (
                      <tr key={k} className="border-b border-edge-soft">
                        <td colSpan={5} className="px-3 py-2">
                          <div className="h-4 w-full animate-pulse rounded-[var(--radius)] bg-panel2" />
                        </td>
                      </tr>
                    ))}
                  {!loading && traces.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[13px] text-fg-4">
                        No traces found.
                      </td>
                    </tr>
                  )}
                  {traces.map((t) => {
                    const isActive = selectedId === t.id;
                    return (
                      <tr
                        key={t.id}
                        className={`cursor-pointer border-b border-edge-soft text-[13px] transition-[background-color] duration-150 hover:bg-panel2 ${
                          isActive ? "bg-panel2" : ""
                        }`}
                        onClick={() => {
                          const url = new URL(window.location.href);
                          if (isActive) {
                            url.searchParams.delete("id");
                          } else {
                            url.searchParams.set("id", t.id);
                          }
                          window.history.pushState({}, "", url.toString());
                          window.dispatchEvent(new PopStateEvent("popstate"));
                        }}
                      >
                        <td className="px-3 py-2 font-medium text-fg">
                          {t.title ?? <span className="text-fg-4">Untitled</span>}
                        </td>
                        <td className="num px-3 py-2 text-fg-2">{t.message_count}</td>
                        <td className="num px-3 py-2 text-fg-2">{formatTokens(t.total_tokens)}</td>
                        <td className="num px-3 py-2 text-fg-2">
                          {formatCost(t.total_cost_microdollars)}
                        </td>
                        <td className="num px-3 py-2 text-fg-3">{formatDate(t.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="mt-3 flex justify-center">
              <Button variant="secondary" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}

          {/* Trace detail waterfall */}
          {selectedId && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-fg">Trace Detail</h2>
                {detail && (
                  <span className="font-mono text-[12px] text-fg-4">
                    {detail.title ?? detail.id}
                  </span>
                )}
              </div>

              {loadingDetail && (
                <div className="space-y-2">
                  {DETAIL_SKEL.map((k) => (
                    <div
                      key={k}
                      className="h-6 w-full animate-pulse rounded-[var(--radius)] bg-panel2"
                    />
                  ))}
                </div>
              )}

              {!loadingDetail && detail && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-edge bg-panel">
                  {/* Column headers */}
                  <div className="flex items-center gap-2 border-b border-edge px-3 py-1.5">
                    <ColLabel className="w-[40%]">Type</ColLabel>
                    <span className="flex-1" />
                    <ColLabel className="w-28">Timeline</ColLabel>
                    <ColLabel className="w-12 text-right">Duration</ColLabel>
                    <ColLabel className="w-14 text-right">Tokens</ColLabel>
                    <ColLabel className="w-14 text-right">Cost</ColLabel>
                  </div>
                  {observations.length > 0 ? (
                    observations.map((obs) => (
                      <ObservationRow
                        key={obs.id}
                        obs={obs}
                        depth={0}
                        traceStart={traceStart}
                        traceDuration={traceDuration}
                      />
                    ))
                  ) : (
                    <div className="py-6 text-center text-[13px] text-fg-4">
                      No observations in this trace.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wraps content in Providers + AppShell + Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export function TracesPage() {
  return (
    <Providers>
      <AppShell>
        <Suspense
          fallback={<div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />}
        >
          <TracesContent />
        </Suspense>
      </AppShell>
    </Providers>
  );
}
