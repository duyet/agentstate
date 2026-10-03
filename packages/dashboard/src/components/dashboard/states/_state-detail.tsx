"use client";

import type { StateEventResponse, StateRecordResponse } from "@agentstate/shared";
import { ClockCounterClockwise, Trash } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, timeAgo } from "@/lib/format";

/** Pretty-print a JSON value for the record and event viewers. */
export function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="num max-h-72 overflow-auto rounded-[var(--radius)] border border-edge bg-panel2 p-3 font-mono text-xs leading-5 text-fg-2">
      <code>{JSON.stringify(value, null, 2)}</code>
    </pre>
  );
}

interface StateDetailProps {
  state: StateRecordResponse;
  /** WAL events for this key, oldest first; null while loading. */
  events: StateEventResponse[] | null;
  /** Sequence cursor for newer events, from GET /:key/events. */
  eventsNextCursor: string | null;
  loadingNewerEvents: boolean;
  onLoadNewerEvents: () => void;
  onDelete: () => void;
}

/**
 * Selected state record: the live data/metadata payload plus the
 * append-only event history (GET /v1/states/:key/events) that
 * produced it. Events arrive oldest-first, so "Load newer
 * events" walks the sequence cursor forward.
 */
export function StateDetail({
  state,
  events,
  eventsNextCursor,
  loadingNewerEvents,
  onLoadNewerEvents,
  onDelete,
}: StateDetailProps) {
  return (
    <Card className="card-padding flex flex-col gap-component">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="break-all font-mono text-[15px] text-fg">{state.state_key}</h2>
          <p className="text-[12.5px] text-fg-4">
            agent <code className="font-mono text-fg-3">{state.agent_id}</code>
            {" · "}sequence <span className="num font-mono text-fg-3">{state.latest_sequence}</span>
            {" · "}created {timeAgo(state.created_at)}
            {" · "}updated {timeAgo(state.updated_at)}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onDelete}>
          <Trash size={15} aria-hidden="true" />
          Delete state
        </Button>
      </div>

      {state.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {state.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-edge bg-panel2 px-2 py-0.5 font-mono text-[10.5px] text-fg-3"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-element">
        <h3 className="as-label">Data</h3>
        <JsonView value={state.data} />
      </div>

      {state.metadata && (
        <div className="flex flex-col gap-element">
          <h3 className="as-label">Metadata</h3>
          <JsonView value={state.metadata} />
        </div>
      )}

      <div className="flex flex-col gap-element">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="as-label flex items-center gap-1.5">
            <ClockCounterClockwise size={13} aria-hidden="true" />
            Event history
          </h3>
          {events !== null && events.length > 0 && (
            <span className="text-[11.5px] text-fg-4">
              {events.length} event{events.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {events === null ? (
          <div className="flex items-center gap-2" aria-live="polite">
            <div
              className="size-5 animate-spin rounded-full border-2 border-edge border-t-fg-4"
              aria-hidden="true"
            />
            <span className="sr-only">Loading events…</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-[12.5px] text-fg-4">No events recorded for this state.</p>
        ) : (
          <ol className="flex flex-col">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-edge-soft py-2 last:border-0"
              >
                <span className="num w-14 shrink-0 font-mono text-[11px] text-fg-4">
                  #{event.sequence}
                </span>
                <Badge tone={event.event_type === "upsert" ? "live" : "warn"}>
                  {event.event_type}
                </Badge>
                <span className="font-mono text-[12px] text-fg-3">{event.agent_id}</span>
                <span className="text-[11.5px] text-fg-4" title={formatDate(event.created_at)}>
                  {timeAgo(event.created_at)}
                </span>
                {event.idempotency_key && (
                  <span className="font-mono text-[10.5px] text-fg-4">
                    idempotency: {event.idempotency_key}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
        {eventsNextCursor && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              loading={loadingNewerEvents}
              onClick={onLoadNewerEvents}
            >
              Load newer events
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
