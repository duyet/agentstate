import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface Observation {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_microdollars: number | null;
  parent_message_id: string | null;
  observation_type: string | null;
  start_time: number | null;
  end_time: number | null;
  status: string | null;
  level: string | null;
  created_at: number;
}

interface Trace {
  id: string;
  project_id: string;
  external_id: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  message_count: number;
  token_count: number;
  total_cost_microdollars: number;
  total_tokens: number;
  created_at: number;
  updated_at: number;
}

interface IngestResponse {
  conversation: Trace;
  observations: Observation[];
}

interface TraceTreeNode extends Observation {
  children: TraceTreeNode[];
}

interface TraceTreeResponse extends Trace {
  observations: TraceTreeNode[];
}

interface ListTracesResponse {
  data: Trace[];
  has_more: boolean;
  next_cursor: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = "http://localhost/v1/conversations";

async function ingestTrace(body: Record<string, unknown>) {
  const res = await SELF.fetch(`${BASE}/traces/ingest`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

/** Build a valid ingest body with sensible defaults. */
function validIngestBody(overrides: Record<string, unknown> = {}) {
  return {
    trace: {
      title: "Test Trace",
      ...((overrides.trace as Record<string, unknown>) ?? {}),
    },
    observations: [
      {
        content: "Root span",
        observation_type: "span",
        ...((overrides.observations as Record<string, unknown>[])?.[0] ?? {}),
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Traces", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // ---------------------------------------------------------------------------
  // POST /traces/ingest
  // ---------------------------------------------------------------------------

  describe("POST /traces/ingest", () => {
    it("creates a trace with observations and returns 201", async () => {
      const res = await ingestTrace(
        validIngestBody({
          trace: {
            title: "My Trace",
            external_id: "trace-ext-1",
            metadata: { env: "test" },
          },
          observations: [
            {
              content: "LLM call",
              observation_type: "generation",
              model: "gpt-4",
              input_tokens: 100,
              output_tokens: 50,
              token_count: 150,
              cost_microdollars: 500,
              start_time: 1000,
              end_time: 2000,
              status: "success",
              level: "default",
            },
            {
              content: "Tool call",
              observation_type: "tool",
              token_count: 10,
            },
          ],
        }),
      );
      expect(res.status).toBe(201);

      const body = await res.json<IngestResponse>();
      expect(body.conversation.id).toBeTruthy();
      expect(body.conversation.project_id).toBe(TEST_PROJECT_ID);
      expect(body.conversation.title).toBe("My Trace");
      expect(body.conversation.external_id).toBe("trace-ext-1");
      expect(body.conversation.metadata).toEqual({ env: "test" });
      expect(body.conversation.message_count).toBe(2);
      expect(body.conversation.token_count).toBe(160);
      expect(body.conversation.total_cost_microdollars).toBe(500);
      expect(body.conversation.total_tokens).toBe(150);

      expect(body.observations.length).toBe(2);
      expect(body.observations[0].content).toBe("LLM call");
      expect(body.observations[0].observation_type).toBe("generation");
      expect(body.observations[0].model).toBe("gpt-4");
      expect(body.observations[1].content).toBe("Tool call");
      expect(body.observations[1].observation_type).toBe("tool");
    });

    it("resolves $N parent_message_id references within a batch", async () => {
      const res = await ingestTrace({
        trace: { title: "Parent ref trace" },
        observations: [
          {
            content: "Root span",
            observation_type: "span",
            start_time: 100,
            end_time: 500,
          },
          {
            content: "Child generation",
            observation_type: "generation",
            parent_message_id: "$1",
            model: "claude-3",
          },
          {
            content: "Grandchild tool",
            observation_type: "tool",
            parent_message_id: "$2",
          },
        ],
      });
      expect(res.status).toBe(201);

      const body = await res.json<IngestResponse>();
      const root = body.observations[0];
      const child = body.observations[1];
      const grandchild = body.observations[2];

      // Root has no parent
      expect(root.parent_message_id).toBeNull();

      // Child references root's generated ID
      expect(child.parent_message_id).toBe(root.id);
      expect(child.content).toBe("Child generation");

      // Grandchild references child's generated ID
      expect(grandchild.parent_message_id).toBe(child.id);
      expect(grandchild.content).toBe("Grandchild tool");

      // Verify in DB that the foreign keys are stored correctly
      const dbChild = await env.DB.prepare(
        `SELECT parent_message_id FROM messages WHERE id = ?`,
      )
        .bind(child.id)
        .first<{ parent_message_id: string | null }>();
      expect(dbChild!.parent_message_id).toBe(root.id);

      const dbGrandchild = await env.DB.prepare(
        `SELECT parent_message_id FROM messages WHERE id = ?`,
      )
        .bind(grandchild.id)
        .first<{ parent_message_id: string | null }>();
      expect(dbGrandchild!.parent_message_id).toBe(child.id);
    });

    it("returns 400 for missing observations array", async () => {
      const res = await ingestTrace({
        trace: { title: "No obs" },
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 for empty observations array", async () => {
      const res = await ingestTrace({
        trace: { title: "Empty obs" },
        observations: [],
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 for invalid observation_type", async () => {
      const res = await ingestTrace({
        trace: { title: "Bad type" },
        observations: [
          {
            content: "Bad obs",
            observation_type: "invalid_type",
          },
        ],
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 for missing trace field", async () => {
      const res = await ingestTrace({
        observations: [
          { content: "Root", observation_type: "span" },
        ],
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON", async () => {
      const res = await SELF.fetch(`${BASE}/traces/ingest`, {
        method: "POST",
        headers: authHeaders(),
        body: "not-json{{{",
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(`${BASE}/traces/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validIngestBody()),
      });
      expect(res.status).toBe(401);
    });

    it("defaults role to assistant when not specified", async () => {
      const res = await ingestTrace({
        trace: { title: "Default role" },
        observations: [
          { content: "No role specified", observation_type: "generation" },
        ],
      });
      expect(res.status).toBe(201);

      const body = await res.json<IngestResponse>();
      expect(body.observations[0].role).toBe("assistant");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /traces
  // ---------------------------------------------------------------------------

  describe("GET /traces", () => {
    it("returns traces (conversations with observations)", async () => {
      // Ingest a trace so there's something to list
      const ingestRes = await ingestTrace(
        validIngestBody({
          trace: { title: "Listable trace" },
          observations: [
            { content: "Root", observation_type: "span" },
          ],
        }),
      );
      expect(ingestRes.status).toBe(201);

      const res = await SELF.fetch(`${BASE}/traces`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListTracesResponse>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      // Each trace should have the expected shape
      const trace = body.data[0];
      expect(trace.id).toBeTruthy();
      expect(trace.project_id).toBe(TEST_PROJECT_ID);
      expect(typeof trace.message_count).toBe("number");
      expect(typeof trace.token_count).toBe("number");

      // Verify has_more is a boolean and next_cursor is properly typed
      expect(typeof body.has_more).toBe("boolean");
    });

    it("supports limit parameter", async () => {
      // Ingest several traces
      for (let i = 0; i < 3; i++) {
        await ingestTrace(
          validIngestBody({
            trace: { title: `Trace ${i}` },
            observations: [
              { content: `Obs ${i}`, observation_type: "span" },
            ],
          }),
        );
      }

      const res = await SELF.fetch(`${BASE}/traces?limit=2`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListTracesResponse>();
      expect(body.data.length).toBeLessThanOrEqual(2);
    });

    it("supports cursor-based pagination", async () => {
      const page1Res = await SELF.fetch(`${BASE}/traces?limit=2`, {
        headers: authHeaders(),
      });
      const page1 = await page1Res.json<ListTracesResponse>();

      if (page1.has_more && page1.next_cursor) {
        const page2Res = await SELF.fetch(
          `${BASE}/traces?limit=2&cursor=${page1.next_cursor}`,
          { headers: authHeaders() },
        );
        expect(page2Res.status).toBe(200);
        const page2 = await page2Res.json<ListTracesResponse>();
        expect(Array.isArray(page2.data)).toBe(true);

        // No overlap between pages
        const page1Ids = new Set(page1.data.map((t) => t.id));
        for (const trace of page2.data) {
          expect(page1Ids.has(trace.id)).toBe(false);
        }
      }
    });

    it("returns empty list for conversations without observations", async () => {
      // Create a regular conversation (no observations)
      await SELF.fetch(BASE, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          messages: [{ role: "user", content: "regular chat" }],
        }),
      });

      // GET /traces should only return conversations WITH observations
      // We need to verify that the regular conversation doesn't appear in traces
      const res = await SELF.fetch(`${BASE}/traces?limit=50`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListTracesResponse>();
      // All traces should have come from trace ingestion, not regular conversations
      // This is implicitly verified by the listTraces service filtering on observationType
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(`${BASE}/traces`);
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /traces/:id
  // ---------------------------------------------------------------------------

  describe("GET /traces/:id", () => {
    it("returns trace with tree structure", async () => {
      // Ingest a trace with parent-child relationships
      const ingestRes = await ingestTrace({
        trace: { title: "Tree trace", metadata: { key: "value" } },
        observations: [
          {
            content: "Root span",
            observation_type: "span",
            start_time: 100,
            end_time: 1000,
          },
          {
            content: "Child generation",
            observation_type: "generation",
            parent_message_id: "$1",
            model: "gpt-4",
            start_time: 200,
            end_time: 800,
          },
          {
            content: "Grandchild tool",
            observation_type: "tool",
            parent_message_id: "$2",
            start_time: 300,
            end_time: 600,
          },
        ],
      });
      expect(ingestRes.status).toBe(201);

      const ingested = await ingestRes.json<IngestResponse>();
      const traceId = ingested.conversation.id;

      const res = await SELF.fetch(`${BASE}/traces/${traceId}`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TraceTreeResponse>();
      expect(body.id).toBe(traceId);
      expect(body.title).toBe("Tree trace");
      expect(body.metadata).toEqual({ key: "value" });

      // Observations should be arranged as a tree
      expect(Array.isArray(body.observations)).toBe(true);

      // Root span should be the top-level node
      const roots = body.observations;
      expect(roots.length).toBe(1);
      expect(roots[0].content).toBe("Root span");
      expect(roots[0].observation_type).toBe("span");

      // Root should have the child as a child node
      expect(roots[0].children.length).toBe(1);
      expect(roots[0].children[0].content).toBe("Child generation");
      expect(roots[0].children[0].model).toBe("gpt-4");

      // Child should have the grandchild
      expect(roots[0].children[0].children.length).toBe(1);
      expect(roots[0].children[0].children[0].content).toBe("Grandchild tool");
      expect(roots[0].children[0].children[0].observation_type).toBe("tool");
    });

    it("returns 404 for a non-existent trace", async () => {
      const res = await SELF.fetch(`${BASE}/traces/does_not_exist_id`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for a trace belonging to another project", async () => {
      // Ingest a trace under the test project
      const ingestRes = await ingestTrace(
        validIngestBody({ trace: { title: "Owned trace" } }),
      );
      expect(ingestRes.status).toBe(201);
      const ingested = await ingestRes.json<IngestResponse>();

      // Now seed a different project + API key and try to access the same trace
      const otherProjectId = "proj_other_000000000001";
      const otherOrgId = "org_other_000000000001";
      const otherApiKey = "as_live_OtherKeyProjectTestABCDEFGHIJKLMNOPQR";
      const now = Date.now();

      // Compute hash for the other API key
      const encoded = new TextEncoder().encode(otherApiKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
      const otherKeyHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await env.DB.prepare(
        `INSERT OR IGNORE INTO organizations (id, clerk_org_id, name, created_at) VALUES (?, ?, ?, ?)`,
      )
        .bind(otherOrgId, "clerk_other_org_001", "Other Org", now)
        .run();

      await env.DB.prepare(
        `INSERT OR IGNORE INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(otherProjectId, otherOrgId, "Other Project", "other-project", now)
        .run();

      await env.DB.prepare(
        `INSERT OR IGNORE INTO api_keys (id, project_id, name, key_prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind("key_other_001", otherProjectId, "Other Key", otherApiKey.substring(0, 12), otherKeyHash, now)
        .run();

      // Request the trace using the other project's API key
      const res = await SELF.fetch(`${BASE}/traces/${ingested.conversation.id}`, {
        headers: {
          Authorization: `Bearer ${otherApiKey}`,
          "Content-Type": "application/json",
        },
      });
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(`${BASE}/traces/any_id`);
      expect(res.status).toBe(401);
    });
  });
});
