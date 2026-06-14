"use client";

import type { ConversationResponse, TraceDetailResponse } from "@agentstate/shared";
import { Button, Table } from "@cloudflare/kumo";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
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
// Observation waterfall
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  generation: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  tool: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  agent: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  chain: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  span: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  event: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const BAR_COLORS: Record<string, string> = {
  generation: "bg-blue-400 dark:bg-blue-500",
  tool: "bg-orange-400 dark:bg-orange-500",
  agent: "bg-purple-400 dark:bg-purple-500",
  chain: "bg-green-400 dark:bg-green-500",
  span: "bg-gray-300 dark:bg-gray-500",
  event: "bg-pink-400 dark:bg-pink-500",
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
        className="flex items-center gap-2 border-b border-border/50 py-1.5 pr-3 text-xs"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <span
          className={`inline-flex h-4 shrink-0 items-center rounded px-1.5 text-[10px] font-medium ${TYPE_COLORS[type] ?? TYPE_COLORS.span}`}
        >
          {type}
        </span>
        <span className="max-w-[140px] truncate text-muted-foreground">
          {obs.model ?? obs.role}
        </span>
        <span className="flex-1" />
        <div className="relative h-2 w-28 shrink-0 rounded-full bg-muted">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${BAR_COLORS[type] ?? BAR_COLORS.span}`}
            style={{
              width: `${Math.min(barWidth, 100)}%`,
              marginLeft: `${Math.min(barOffset, 100)}%`,
            }}
          />
        </div>
        <span className="w-12 text-right tabular-nums text-muted-foreground">
          {obs.start_time && obs.end_time ? formatDuration(obs.start_time, obs.end_time) : "-"}
        </span>
        <span className="w-14 text-right tabular-nums text-muted-foreground">
          {formatTokens(obs.token_count)}
        </span>
        <span className="w-14 text-right tabular-nums text-muted-foreground">
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
// Trace content (uses useSearchParams, must be inside Suspense)
// ---------------------------------------------------------------------------

function TracesContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  // Trace list
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<{ data: TraceItem[]; has_more: boolean }>("/v1/conversations/traces?limit=50")
      .then((res) => {
        setTraces(res.data);
        setHasMore(res.has_more);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load traces"))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || traces.length === 0) return;
    const cursor = traces[traces.length - 1].created_at.toString();
    setLoadingMore(true);
    api<{ data: TraceItem[]; has_more: boolean }>(
      `/v1/conversations/traces?limit=50&cursor=${cursor}`,
    )
      .then((res) => {
        setTraces((prev) => [...prev, ...res.data]);
        setHasMore(res.has_more);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load more"))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, traces]);

  // Trace detail
  const [detail, setDetail] = useState<TraceDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    api<TraceDetailResponse>(`/v1/conversations/traces/${selectedId}`)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load trace detail"))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

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

  return (
    <div className="px-4 lg:px-6">
      <PageHeader title="Traces" description="LLM execution traces and observability." />

      {/* Traces table */}
      <div className="rounded-lg border border-border">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head className="w-[40%]">Title</Table.Head>
              <Table.Head>Observations</Table.Head>
              <Table.Head>Tokens</Table.Head>
              <Table.Head>Cost</Table.Head>
              <Table.Head>Created</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
                <Table.Row key={i}>
                  <Table.Cell colSpan={5}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </Table.Cell>
                </Table.Row>
              ))}
            {!loading && traces.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No traces found.
                </Table.Cell>
              </Table.Row>
            )}
            {traces.map((t) => {
              const isActive = selectedId === t.id;
              return (
                <Table.Row
                  key={t.id}
                  variant={isActive ? "selected" : "default"}
                  className={`cursor-pointer ${isActive ? "bg-muted" : ""}`}
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
                  <Table.Cell className="font-medium">
                    {t.title ?? <span className="text-muted-foreground">Untitled</span>}
                  </Table.Cell>
                  <Table.Cell className="tabular-nums">{t.message_count}</Table.Cell>
                  <Table.Cell className="tabular-nums">{formatTokens(t.total_tokens)}</Table.Cell>
                  <Table.Cell className="tabular-nums">
                    {formatCost(t.total_cost_microdollars)}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {formatDate(t.created_at)}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      {/* Trace detail waterfall */}
      {selectedId && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Trace Detail</h2>
            {detail && (
              <span className="text-xs text-muted-foreground">{detail.title ?? detail.id}</span>
            )}
          </div>

          {loadingDetail && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
                <div key={i} className="h-6 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {!loadingDetail && detail && (
            <div className="rounded-lg border border-border bg-card">
              {/* Column headers */}
              <div className="flex items-center gap-2 border-b px-3 py-1.5 text-[10.5px] font-mono font-medium tracking-[0.08em] text-muted-foreground uppercase">
                <span className="w-[40%]">Type</span>
                <span className="flex-1" />
                <span className="w-28">Timeline</span>
                <span className="w-12 text-right">Duration</span>
                <span className="w-14 text-right">Tokens</span>
                <span className="w-14 text-right">Cost</span>
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
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No observations in this trace.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wraps in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function TracesPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>
      <TracesContent />
    </Suspense>
  );
}
