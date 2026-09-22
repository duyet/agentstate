import { DurableObject } from "cloudflare:workers";
import { mapStateEventRow, type StateEventResponse } from "./services/states";

type Env = {
  DB: D1Database;
};

type StateEventRow = {
  sequence: number;
  id: string;
  state_key: string;
  agent_id: string;
  event_type: "upsert" | "delete";
  data: string | null;
  metadata: string | null;
  tags: string;
  idempotency_key: string | null;
  created_at: number;
};

/** A watcher that hasn't finished replay yet — events broadcast during replay
 * are buffered here instead of going straight to the writer, so they can't
 * interleave with or duplicate backlog rows (#366). */
type PendingWatcher = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  buffered: StateEventResponse[];
};

export class StateStreamHub extends DurableObject<Env> {
  private writers = new Set<WritableStreamDefaultWriter<Uint8Array>>();
  private pendingWatchers = new Set<PendingWatcher>();
  private encoder = new TextEncoder();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/notify") {
      const event = await request.json<StateEventResponse>();
      await this.broadcast(event);
      return new Response(null, { status: 204 });
    }

    if (request.method === "GET" && url.pathname === "/watch") {
      const projectId = request.headers.get("X-Project-Id");
      if (!projectId) return new Response("Missing project", { status: 400 });
      const after = Number(url.searchParams.get("after") ?? "0");
      return this.watch(projectId, Number.isFinite(after) && after > 0 ? after : 0, request.signal);
    }

    return new Response("Not found", { status: 404 });
  }

  private async watch(projectId: string, after: number, signal: AbortSignal): Promise<Response> {
    let controller!: TransformStreamDefaultController<Uint8Array>;
    const stream = new TransformStream<Uint8Array, Uint8Array>({
      start(streamController) {
        controller = streamController;
      },
    });
    const writer = stream.writable.getWriter();

    // Phase 1: buffer live events into pendingWatchers so they can't
    // interleave with backlog replay (#366). Writer is NOT added to
    // this.writers until after writeBacklog completes.
    const pending: PendingWatcher = { writer, buffered: [] };
    this.pendingWatchers.add(pending);

    const cleanup = () => {
      clearInterval(heartbeat);
      this.pendingWatchers.delete(pending);
      this.writers.delete(writer);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      // Error the readable too, releasing any backpressured replay write.
      controller.error(signal.reason);
      cleanup();
    };
    const heartbeat = setInterval(() => {
      writer.write(this.encoder.encode("event: ping\ndata: {}\n\n")).catch(cleanup);
    }, 15_000);

    signal.addEventListener("abort", abort, { once: true });
    void writer.closed.then(cleanup, cleanup);
    if (signal.aborted) abort();

    // Return the readable before awaiting writes: replay is backpressured until
    // the caller can attach a reader to the response (#360).
    this.ctx.waitUntil(
      this.writeBacklog(writer, projectId, after)
        .then(async (lastSeq) => {
          // Phase 2: drain broadcast events buffered during replay — skip any
          // already covered by the backlog (sequence <= lastSeq), write the
          // rest in sequence order. Broadcasts arriving mid-flush re-fill
          // pending.buffered and are drained by the next pass.
          while (pending.buffered.length > 0) {
            const batch = pending.buffered.splice(0).sort((a, b) => a.sequence - b.sequence);
            for (const event of batch) {
              if (event.sequence <= lastSeq) continue;
              await writer.write(this.encoder.encode(formatSse(event)));
              lastSeq = event.sequence;
            }
          }
          // Phase 3: atomically move writer into the live broadcast set.
          // No await between flush and registration → no interleaving window.
          // delete() returning false means cleanup already ran (abort/closed
          // during replay) — don't register a dead writer.
          if (this.pendingWatchers.delete(pending)) this.writers.add(writer);
        })
        .catch((error) => {
          controller.error(error);
          cleanup();
        }),
    );

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Content-Encoding": "Identity",
        Connection: "keep-alive",
      },
    });
  }

  private async writeBacklog(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    projectId: string,
    after: number,
  ): Promise<number> {
    const result = await this.env.DB.prepare(
      `SELECT sequence, id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at
       FROM state_events
       WHERE project_id = ? AND sequence > ?
       ORDER BY sequence ASC
       LIMIT 1000`,
    )
      .bind(projectId, after)
      .all<StateEventRow>();

    let lastSeq = after;
    for (const row of result.results ?? []) {
      await writer.write(this.encoder.encode(formatSse(mapStateEventRow(row))));
      lastSeq = row.sequence;
    }
    return lastSeq;
  }

  private async broadcast(event: StateEventResponse) {
    const payload = this.encoder.encode(formatSse(event));
    for (const writer of this.writers) {
      writer.write(payload).catch(() => {
        this.writers.delete(writer);
      });
    }
    // Buffer for watchers still in the backlog-replay phase so they receive
    // this event after the backlog, in the correct order, deduped (#366).
    for (const pending of this.pendingWatchers) {
      pending.buffered.push(event);
    }
  }
}

function formatSse(event: StateEventResponse): string {
  return `id: ${event.sequence}\nevent: state.${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`;
}
