import { drizzle } from "drizzle-orm/d1";
import { cleanupExpiredConversations } from "./services/retention";
import type { Bindings } from "./types";

export async function onScheduled(
	event: ScheduledEvent,
	env: Bindings,
	_ctx: ExecutionContext,
): Promise<void> {
	const db = drizzle(env.DB);
	const results = await cleanupExpiredConversations(db, env.DB);

	console.log(
		JSON.stringify({
			level: "info",
			event: "retention_cleanup",
			trigger: event.cron,
			results,
			totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
		}),
	);
}
