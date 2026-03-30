import { drizzle } from "drizzle-orm/d1";
import { cleanupExpiredConversations } from "./services/retention";
import type { Bindings } from "./types";

export async function onScheduled(
	event: ScheduledEvent,
	env: Bindings,
	_ctx: ExecutionContext,
): Promise<void> {
	const db = drizzle(env.DB);

	try {
		const results = await cleanupExpiredConversations(db);

		console.log(
			JSON.stringify({
				level: "info",
				event: "retention_cleanup",
				trigger: event.cron,
				results,
				totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
			}),
		);
	} catch (err) {
		console.error(
			JSON.stringify({
				level: "error",
				event: "retention_cleanup_failed",
				error: err instanceof Error ? err.message : String(err),
				trigger: event.cron,
			}),
		);
	}
}
