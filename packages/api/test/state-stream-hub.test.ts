import { env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { StateEventResponse } from "../src/services/states";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

async function within<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Watch stalled for 3 seconds")), 3_000);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

async function seedEvent(index: number): Promise<StateEventResponse> {
  const event = {
    id: crypto.randomUUID(),
    state_key: `watch-${index}`,
    agent_id: "watch-agent",
    event_type: "upsert" as const,
    data: { index },
    metadata: null,
    tags: ["watch"],
    idempotency_key: null,
    created_at: Date.now(),
  };
  // Seed directly so no delayed /notify races with backlog-only assertions (#366).
  const row = await env.DB.prepare(
    `INSERT INTO state_events
      (id, project_id, state_key, agent_id, event_type, data, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING sequence`,
  )
    .bind(
      event.id,
      TEST_PROJECT_ID,
      event.state_key,
      event.agent_id,
      event.event_type,
      JSON.stringify(event.data),
      JSON.stringify(event.tags),
      event.created_at,
    )
    .first<{ sequence: number }>();
  return { ...event, sequence: row!.sequence };
}

async function openWatch(after = 0) {
  // No once=true: this must exercise the real StateStreamHub DO via the API.
  const pending = SELF.fetch(`http://localhost/api/v1/states/watch?after=${after}`, {
    headers: authHeaders(),
  });
  let response: Response;
  try {
    response = await within(pending);
  } catch (error) {
    void pending.then((late) => late.body?.cancel()).catch(() => {});
    throw error;
  }
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  return {
    response,
    cancel: () => within(reader.cancel()),
    read: () =>
      within(
        (async () => {
          while (!buffer.includes("\n\n")) {
            const chunk = await reader.read();
            if (chunk.done) throw new Error("Watch closed before the next event");
            buffer += decoder.decode(chunk.value, { stream: true });
          }
          const boundary = buffer.indexOf("\n\n");
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          return frame;
        })(),
      ),
  };
}

function expectFrame(frameText: string, event: StateEventResponse) {
  const lines = frameText.split("\n");
  expect(lines[0]).toBe(`id: ${event.sequence}`);
  expect(lines[1]).toBe(`event: state.${event.event_type}`);
  expect(lines[2].startsWith("data: ")).toBe(true);
  // Compare parsed JSON: key order differs between the replay mapper and a
  // broadcast payload, but clients consume JSON semantics.
  expect(JSON.parse(lines[2].slice("data: ".length))).toEqual(event);
}

async function notify(event: StateEventResponse) {
  const hub = env.STATE_STREAM_HUB.getByName(TEST_PROJECT_ID);
  const response = await within(
    hub.fetch("https://state-stream.local/notify", {
      method: "POST",
      body: JSON.stringify(event),
    }),
  );
  expect(response.status).toBe(204);
}

describe("StateStreamHub watch", () => {
  beforeAll(applyMigrations);
  beforeEach(seedProject);

  it.each([1, 3])("opens and replays a %i-row backlog without hanging", async (count) => {
    const events = [];
    for (let index = 0; index < count; index++) events.push(await seedEvent(index));
    const watch = await openWatch();
    try {
      expect(watch.response.status).toBe(200);
      expect(watch.response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(watch.response.headers.get("Cache-Control")).toBe("no-cache");
      for (const event of events) expectFrame(await watch.read(), event);
      const live = await seedEvent(count);
      await notify(live);
      expectFrame(await watch.read(), live);
    } finally {
      await watch.cancel();
    }
  });

  it("replays only events after the reconnect cursor", async () => {
    const first = await seedEvent(0);
    const second = await seedEvent(1);
    const watch = await openWatch(first.sequence);
    try {
      expectFrame(await watch.read(), second);
    } finally {
      await watch.cancel();
    }
  });

  it("opens an empty backlog and receives live notifications", async () => {
    const watch = await openWatch();
    try {
      expect(watch.response.status).toBe(200);
      const live = await seedEvent(0);
      await notify(live);
      expectFrame(await watch.read(), live);
    } finally {
      await watch.cancel();
    }
  });

  it("delivers mid-replay broadcasts after the backlog, in order, without duplicates", async () => {
    const events = [await seedEvent(0), await seedEvent(1), await seedEvent(2)];
    const watch = await openWatch();
    try {
      // Reading the first frame proves the backlog query already ran and
      // replay is mid-flight: the remaining rows are still backpressured
      // behind this reader, so the watcher stays in the pending phase.
      expectFrame(await watch.read(), events[0]);
      // Re-broadcast a backlog row already captured by the replay query —
      // the buffered copy must be deduped against the drained backlog (#366).
      await notify(events[2]);
      // A genuinely new event broadcast mid-replay must land after the backlog.
      const live = await seedEvent(3);
      await notify(live);
      // Strictly ascending sequence, no interleaving, no duplicate of events[2].
      expectFrame(await watch.read(), events[1]);
      expectFrame(await watch.read(), events[2]);
      expectFrame(await watch.read(), live);
    } finally {
      await watch.cancel();
    }
  });

  it("drops a cancelled watcher's buffer; later broadcasts do not throw", async () => {
    const events = [await seedEvent(0), await seedEvent(1), await seedEvent(2)];
    const watch = await openWatch();
    expectFrame(await watch.read(), events[0]);
    // Cancel mid-replay while the watcher is still pending (#366).
    await watch.cancel();
    const live = await seedEvent(3);
    await notify(live);
  });

  it("can cancel without consuming the backlog and reconnect", async () => {
    const event = await seedEvent(0);
    const unread = await openWatch();
    await unread.cancel();
    const watch = await openWatch();
    try {
      expectFrame(await watch.read(), event);
    } finally {
      await watch.cancel();
    }
  });
});
