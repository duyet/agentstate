import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
	conversations,
	conversationTags,
	messages,
	projects,
} from "../db/schema";

const BATCH_SIZE = 500;
const TIME_BUDGET_MS = 25_000;

interface RetentionResult {
	projectId: string;
	deleted: number;
	retentionDays: number;
	durationMs: number;
}

/**
 * Batch-delete expired conversations for all projects with retention_days configured.
 * Respects a time budget to avoid Worker timeout (30s limit).
 * Delete order: tags → messages → conversations (FK constraints).
 */
export async function cleanupExpiredConversations(
	db: DrizzleD1Database,
): Promise<RetentionResult[]> {
	const start = Date.now();
	const results: RetentionResult[] = [];

	// Find all projects with retention enabled
	const projectsWithRetention = await db
		.select({
			id: projects.id,
			retentionDays: projects.retentionDays,
		})
		.from(projects)
		.where(isNotNull(projects.retentionDays));

	if (projectsWithRetention.length === 0) {
		return results;
	}

	for (const project of projectsWithRetention) {
		const projectStart = Date.now();
		if (projectStart - start > TIME_BUDGET_MS) {
			console.warn(
				JSON.stringify({
					level: "warn",
					event: "retention_time_budget_exceeded",
					message: "Stopping retention cleanup — time budget exceeded",
					elapsedMs: Date.now() - start,
				}),
			);
			break;
		}

		const retentionDays = project.retentionDays as number;
		const cutoff = Date.now() - retentionDays * 86_400_000;
		let totalDeleted = 0;
		let batchCount = 0;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (Date.now() - start > TIME_BUDGET_MS) break;

			// Fetch a batch of expired conversation IDs
			const expired = await db
				.select({ id: conversations.id })
				.from(conversations)
				.where(
					and(
						eq(conversations.projectId, project.id),
						lt(conversations.updatedAt, cutoff),
					),
				)
				.limit(BATCH_SIZE);

			if (expired.length === 0) break;

			const ids = expired.map((r) => r.id);

			// Batch delete: tags → messages → conversations (order respects FK constraints)
			await db.batch([
				db
					.delete(conversationTags)
					.where(inArray(conversationTags.conversationId, ids)),
				db.delete(messages).where(inArray(messages.conversationId, ids)),
				db.delete(conversations).where(inArray(conversations.id, ids)),
			]);

			totalDeleted += ids.length;
			batchCount++;

			// If we got fewer than BATCH_SIZE, this was the last batch
			if (expired.length < BATCH_SIZE) break;
		}

		results.push({
			projectId: project.id,
			deleted: totalDeleted,
			retentionDays,
			durationMs: Date.now() - projectStart,
		});

		console.info(
			JSON.stringify({
				level: "info",
				event: "retention_cleanup_project",
				projectId: project.id,
				retentionDays,
				deleted: totalDeleted,
				batches: batchCount,
			}),
		);
	}

	return results;
}
