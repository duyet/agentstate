// Ambient declarations so this file typechecks without @types/node.
// Bun and Node both provide these globals at runtime.
declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

import { AgentState, AgentStateError } from "../../packages/sdk/src/index";

/**
 * Fleet Leases Example — coordinate N agents with zero double-writes
 *
 * Spawns K concurrent workers that race to claim tasks via state leases.
 * Each task is processed EXACTLY ONCE: the first worker to acquire the
 * lease wins; all others see a 409 and move on. After all tasks are done,
 * the script asserts the exactly-one-writer invariant and exits 1 on any
 * violation.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AGENTSTATE_API_KEY = process.env.AGENTSTATE_API_KEY;
const AGENTSTATE_BASE_URL = process.env.AGENTSTATE_BASE_URL ?? "https://agentstate.app/api";

if (!AGENTSTATE_API_KEY) {
  console.error("ERROR: AGENTSTATE_API_KEY environment variable is required.");
  console.error("  Export it first: export AGENTSTATE_API_KEY=as_live_...");
  process.exit(1);
}

const TASK_COUNT = Number(process.env.TASK_COUNT ?? 20);
const WORKER_COUNT = Number(process.env.WORKER_COUNT ?? 5);
const LEASE_TTL_MS = Number(process.env.LEASE_TTL_MS ?? 30_000);

// ---------------------------------------------------------------------------
// Shared state (all workers run in the same process for this example)
// ---------------------------------------------------------------------------

// Maps taskId → workerId that claimed and processed it.
const processed = new Map<string, string>();
// The full set of tasks. EVERY worker iterates the SAME set and races to claim
// each task. The lease is the ONLY thing preventing two workers from processing
// the same task — delete the lease and the exactly-once assertion below fails.
const taskIds: string[] = Array.from(
  { length: TASK_COUNT },
  (_, i) => `fleet-task-${String(i + 1).padStart(3, "0")}`,
);

// Simulated "work result" accumulator.
const results: Array<{ taskId: string; workerId: string; doneAt: number }> = [];

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const client = new AgentState({
  apiKey: AGENTSTATE_API_KEY,
  baseUrl: AGENTSTATE_BASE_URL,
  // Disable retries for 409s — they are expected, not errors.
  maxRetries: 0,
});

// ---------------------------------------------------------------------------
// Worker logic
// ---------------------------------------------------------------------------

async function runWorker(workerId: string): Promise<void> {
  // Keep scanning the shared task set until every task is processed. Workers
  // genuinely contend: several may target the same task at once, and the
  // server-side lease is what serialises them into exactly-one-writer.
  while (processed.size < taskIds.length) {
    let didWork = false;

    for (const taskId of taskIds) {
      // Cheap local skip for tasks already completed by some worker.
      if (processed.has(taskId)) continue;

      const stateKey = `task:${taskId}`;
      let lease: Awaited<ReturnType<typeof client.createStateLease>>;

      try {
        // Race to claim. If another worker holds this task RIGHT NOW we get 409.
        lease = await client.createStateLease(stateKey, {
          holder: workerId,
          ttl_ms: LEASE_TTL_MS,
        });
      } catch (err) {
        if (err instanceof AgentStateError && err.status === 409) {
          // Contention: another worker is processing this task. Move on; we'll
          // revisit next pass (by then it's marked done and skipped cheaply).
          continue;
        }
        throw err; // Unexpected error — propagate.
      }

      try {
        // We hold the lease. Re-check the done-marker to close the window where
        // the task was completed and released between our skip-check and acquire.
        if (processed.has(taskId)) continue;

        // --- Do the work (exactly once, guaranteed by the lease) ---
        console.log(`  ${workerId} → ${taskId}: PROCESSING (lease=${lease.id})`);
        await new Promise<void>((resolve) => setTimeout(resolve, Math.random() * 10));
        results.push({ taskId, workerId, doneAt: Date.now() });
        processed.set(taskId, workerId);
        didWork = true;
      } finally {
        // Release so the next worker can reuse the slot immediately (otherwise
        // it would free only when the TTL expires). `finally` runs on the
        // re-check `continue` too, so we never leak a lease we acquired.
        try {
          await client.releaseStateLease(lease.id);
        } catch (releaseErr) {
          console.warn(`  ${workerId} → ${taskId}: release failed (expires via TTL):`, releaseErr);
        }
      }
    }

    // A full pass did nothing but tasks remain → the rest are held by other
    // workers mid-flight. Yield briefly and rescan instead of busy-looping.
    if (!didWork && processed.size < taskIds.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
  }
}

// ---------------------------------------------------------------------------
// Assertion
// ---------------------------------------------------------------------------

function assertExactlyOnce(): void {
  // Every task must appear in `processed` exactly once.
  const doubleProcessed: string[] = [];
  const unprocessed: string[] = [];

  for (const taskId of taskIds) {
    if (!processed.has(taskId)) {
      unprocessed.push(taskId);
    }
  }

  // Check results for duplicates (belt-and-suspenders: processed Map already
  // deduplicates by key, but results array captures every write attempt).
  const countByTask = new Map<string, number>();
  for (const r of results) {
    countByTask.set(r.taskId, (countByTask.get(r.taskId) ?? 0) + 1);
  }
  for (const [taskId, count] of countByTask) {
    if (count > 1) {
      doubleProcessed.push(`${taskId} (processed ${count} times)`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  FLEET LEASES — RESULTS");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Tasks total       : ${TASK_COUNT}`);
  console.log(`  Workers           : ${WORKER_COUNT}`);
  console.log(`  Tasks processed   : ${results.length}`);
  console.log(`  Unique tasks done : ${processed.size}`);
  console.log(`  Unprocessed       : ${unprocessed.length}`);
  console.log(`  Double-processed  : ${doubleProcessed.length}`);

  if (doubleProcessed.length > 0) {
    console.log("\n  DOUBLE-PROCESSED (BUG):");
    for (const t of doubleProcessed) console.log(`    • ${t}`);
  }
  if (unprocessed.length > 0) {
    console.log("\n  NOT PROCESSED:");
    for (const t of unprocessed) console.log(`    • ${t}`);
  }

  const pass = doubleProcessed.length === 0 && unprocessed.length === 0;

  console.log("\n  ─────────────────────────────────────────────────────");
  if (pass) {
    console.log("  ✔  PASS — every task processed exactly once.");
  } else {
    console.log("  ✘  FAIL — invariant violated (see above).");
  }
  console.log("═══════════════════════════════════════════════════════\n");

  if (!pass) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("AgentState — Fleet Leases Example");
  console.log(`  API base : ${AGENTSTATE_BASE_URL}`);
  console.log(`  Tasks    : ${TASK_COUNT}`);
  console.log(`  Workers  : ${WORKER_COUNT}`);
  console.log(`  Lease TTL: ${LEASE_TTL_MS} ms`);
  console.log("\nStarting workers...\n");

  // Spawn K workers in parallel. They share the task queue and race for leases.
  const workers = Array.from({ length: WORKER_COUNT }, (_, i) => runWorker(`worker-${i + 1}`));

  await Promise.all(workers);

  assertExactlyOnce();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
