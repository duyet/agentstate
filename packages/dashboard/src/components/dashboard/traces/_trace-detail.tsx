import type { TraceDetailResponse } from "@agentstate/shared";
import { Card } from "@/components/ui/card";
import { ObservationRow } from "./_observation-row";

// Stable keys for the detail-loading skeleton (avoids array-index keys).
const DETAIL_SKEL = ["detail-skel-1", "detail-skel-2", "detail-skel-3", "detail-skel-4"] as const;

// Matches TableHead's label styling (font-mono, uppercase, fg-4) for a
// non-<table> column header row (the waterfall body isn't a real <table>).
function ColLabel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`font-mono text-[10.5px] font-normal uppercase tracking-[0.12em] text-fg-4 ${className}`}
    >
      {children}
    </span>
  );
}

export interface TraceDetailProps {
  detail: TraceDetailResponse | null;
  loadingDetail: boolean;
}

/**
 * Trace detail waterfall — observation tree with per-row duration bars,
 * token counts, and cost. Rendered below the traces table when a row is
 * selected (see traces-page.tsx).
 */
export function TraceDetail({ detail, loadingDetail }: TraceDetailProps) {
  const observations = detail?.observations ?? [];
  const traceStart =
    observations.length > 0
      ? observations.reduce(
          (min, o) => Math.min(min, o.start_time ?? Number.POSITIVE_INFINITY),
          Number.POSITIVE_INFINITY,
        )
      : 0;
  const traceEnd =
    observations.length > 0
      ? observations.reduce(
          (max, o) => Math.max(max, o.end_time ?? Number.NEGATIVE_INFINITY),
          Number.NEGATIVE_INFINITY,
        )
      : 0;
  const traceDuration = traceEnd > traceStart ? traceEnd - traceStart : 0;

  return (
    <div className="mt-section">
      <div className="mb-element flex items-center gap-tight">
        <h2 className="text-[14px] font-semibold text-fg">Trace Detail</h2>
        {detail && (
          <span className="font-mono text-[12px] text-fg-4">{detail.title ?? detail.id}</span>
        )}
      </div>

      {loadingDetail && (
        <div className="flex flex-col gap-tight">
          {DETAIL_SKEL.map((k) => (
            <div key={k} className="h-6 w-full animate-pulse rounded-[var(--radius)] bg-panel2" />
          ))}
        </div>
      )}

      {!loadingDetail && detail && (
        <Card className="overflow-hidden p-0">
          {/* Column headers */}
          <div className="flex items-center gap-tight border-b border-edge px-3 py-1.5">
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
        </Card>
      )}
    </div>
  );
}
