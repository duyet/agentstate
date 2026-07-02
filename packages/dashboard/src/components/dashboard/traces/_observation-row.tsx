import type { TraceDetailResponse } from "@agentstate/shared";
import { Badge, type Tone } from "@/components/ui/badge";
import { formatCostMicrodollars } from "@/lib/format-cost";
import { formatObservationDuration, formatTraceTokens } from "./_trace-format";

// Badge tone per observation type (mapped to the design-system token palette).
const TYPE_TONE: Record<string, Tone> = {
  generation: "live",
  tool: "warn",
  agent: "live",
  chain: "warn",
  span: "idle",
  event: "warn",
};

// Waterfall bar fill per observation type — single accent + functional tokens only.
const BAR_COLOR: Record<string, string> = {
  generation: "bg-accent",
  tool: "bg-warn",
  agent: "bg-accent",
  chain: "bg-pos",
  span: "bg-fg-4",
  event: "bg-warn",
};

export function ObservationRow({
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
        className="flex items-center gap-tight border-b border-edge-soft py-1.5 pr-3 text-[12px] text-fg-3"
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
          {formatObservationDuration(obs.start_time, obs.end_time)}
        </span>
        <span className="num w-14 text-right text-fg-3">{formatTraceTokens(obs.token_count)}</span>
        <span className="num w-14 text-right text-fg-3">
          {formatCostMicrodollars(obs.cost_microdollars)}
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
