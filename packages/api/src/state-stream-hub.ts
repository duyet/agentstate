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

export class StateStreamHub extends DurableObject<Env> {
  private writers = new Set<WritableStreamDefaultWriter<Uint8Array>>();
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
    // FIXME(ordering + deadlock, see PR): `this.writers.add(writer)` below runs
    // before `writeBacklog` completes, so a concurrent `/notify` can interleave
    // or duplicate events ahead of the backlog replay. Separately (verified
    // against the real DO runtime via vitest-pool-workers): `writer.write()`
    // cannot resolve until something reads `stream.readable`, but the
    // `Response` wrapping it is only returned after `await writeBacklog(...)`
    // below completes -- so any backlog with 1+ rows deadlocks the request
    // today. Fix in progress: return the Response immediately and run
    // backlog-write + buffered-broadcast-flush + writer-registration as
    // background work.
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();
    this.writers.add(writer);

    const heartbeat = setInterval(() => {
      writer.write(this.encoder.encode("event: ping\ndata: {}\n\n")).catch(() => {
        this.writers.delete(writer);
      });
    }, 15_000);

    signal.addEventListener("abort", () => {
      clearInterval(heartbeat);
      this.writers.delete(writer);
      writer.close().catch(() => {});
    });

    await this.writeBacklog(writer, projectId, after);

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
  ) {
    const result = await this.env.DB.prepare(
      `SELECT sequence, id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at
       FROM state_events
       WHERE project_id = ? AND sequence > ?
       ORDER BY sequence ASC
       LIMIT 1000`,
    )
      .bind(projectId, after)
      .all<StateEventRow>();

    for (const row of result.results ?? []) {
      await writer.write(this.encoder.encode(formatSse(mapStateEventRow(row))));
    }
  }

  private async broadcast(event: StateEventResponse) {
    const payload = this.encoder.encode(formatSse(event));
    for (const writer of this.writers) {
      writer.write(payload).catch(() => {
        this.writers.delete(writer);
      });
    }
  }
}

function formatSse(event: StateEventResponse): string {
  return `id: ${event.sequence}\nevent: state.${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`;
}
