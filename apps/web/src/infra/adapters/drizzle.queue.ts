import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { deadLetterQueue } from "@/infra/db/drizzle/schema";
import {
	type IJob,
	IQueue,
	type TJobStatus,
	type TQueueError,
} from "@/shared/ports/queue.port";
import { withRetry } from "@/shared/utils";
import { generateId } from "@/shared/utils/id";

type TDeadLetterQueueRow = typeof deadLetterQueue.$inferSelect;

const mapJob = (row: TDeadLetterQueueRow): IJob => {
	const createdAt =
		typeof row.createdAt === "string"
			? row.createdAt
			: new Date(row.createdAt ?? Date.now()).toISOString();
	const updatedAt =
		typeof row.updatedAt === "string"
			? row.updatedAt
			: new Date(row.updatedAt ?? Date.now()).toISOString();
	const lockedAt =
		typeof row.lockedAt === "string"
			? row.lockedAt
			: row.lockedAt
				? new Date(row.lockedAt).toISOString()
				: null;
	const nextAttemptAt =
		typeof row.nextAttemptAt === "string"
			? row.nextAttemptAt
			: row.nextAttemptAt
				? new Date(row.nextAttemptAt).toISOString()
				: null;

	return {
		id: row.id,
		businessId: row.businessId,
		operation: row.operation,
		payload: row.payload,
		errorMessage: row.errorMessage,
		errorStack: row.errorStack,
		status: row.status as TJobStatus,
		retryCount: row.retryCount,
		lockedAt,
		lockedBy: row.lockedBy,
		nextAttemptAt,
		idempotencyKey: row.idempotencyKey,
		createdAt,
		updatedAt,
	};
};

export const DrizzleQueueAdapterLive = Layer.effect(
	IQueue,
	Effect.map(IDrizzleClient, (db) =>
		IQueue.of({
			enqueue: (operation, payload, businessId, idempotencyKey) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// If idempotencyKey is provided, try insert with ON CONFLICT DO NOTHING
							if (idempotencyKey) {
								const [row] = await db
									.insert(deadLetterQueue)
									.values({
										operation,
										payload,
										businessId,
										status: "pending",
										retryCount: 0,
										idempotencyKey,
									})
									.onConflictDoNothing()
									.returning({ id: deadLetterQueue.id });

								if (row) return row.id;

								// Conflict — return existing job ID
								const [existing] = await db
									.select({ id: deadLetterQueue.id })
									.from(deadLetterQueue)
									.where(
										and(
											eq(deadLetterQueue.businessId, businessId),
											eq(deadLetterQueue.idempotencyKey, idempotencyKey),
										),
									)
									.limit(1);

								if (!existing)
									throw new Error(
										"Idempotency conflict but no existing row found",
									);
								return existing.id;
							}

							// No idempotencyKey — insert normally with a generated key
							const [row] = await db
								.insert(deadLetterQueue)
								.values({
									operation,
									payload,
									businessId,
									status: "pending",
									retryCount: 0,
									idempotencyKey: generateId(),
								})
								.returning({ id: deadLetterQueue.id });

							if (!row) throw new Error("Insert returned no rows");
							return row.id;
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: `Failed to enqueue background job: ${operation}`,
								cause: e,
							}) as TQueueError,
					}),
				),

			findById: (jobId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.select()
								.from(deadLetterQueue)
								.where(eq(deadLetterQueue.id, jobId))
								.limit(1);

							return row ? mapJob(row) : null;
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: `Failed to find background job by ID: ${jobId}`,
								cause: e,
							}) as TQueueError,
					}),
				),

			claimPending: (limit, workerId, now) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const claimedAt = now.toISOString();
							const rows = await db.transaction(async (tx) => {
								const pending = await tx
									.select()
									.from(deadLetterQueue)
									.where(
										and(
											eq(deadLetterQueue.status, "pending"),
											or(
												isNull(deadLetterQueue.nextAttemptAt),
												lte(deadLetterQueue.nextAttemptAt, now.toISOString()),
											),
										),
									)
									.limit(limit)
									.for("update", { skipLocked: true });

								if (pending.length > 0) {
									const ids = pending.map((r) => r.id);
									await tx
										.update(deadLetterQueue)
										.set({
											status: "processing",
											lockedAt: claimedAt,
											lockedBy: workerId,
											updatedAt: claimedAt,
										})
										.where(inArray(deadLetterQueue.id, ids));
								}

								return pending;
							});

							return rows.map((row) =>
								mapJob({
									...row,
									status: "processing",
									lockedAt: claimedAt,
									lockedBy: workerId,
									updatedAt: claimedAt,
								}),
							);
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: "Failed to claim pending background jobs",
								cause: e,
							}) as TQueueError,
					}),
				),

			claimJob: (jobId, workerId, now) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const claimedAt = now.toISOString();
							const row = await db.transaction(async (tx) => {
								const [pending] = await tx
									.select()
									.from(deadLetterQueue)
									.where(
										and(
											eq(deadLetterQueue.id, jobId),
											eq(deadLetterQueue.status, "pending"),
											or(
												isNull(deadLetterQueue.nextAttemptAt),
												lte(deadLetterQueue.nextAttemptAt, claimedAt),
											),
										),
									)
									.limit(1)
									.for("update", { skipLocked: true });

								if (!pending) return null;

								await tx
									.update(deadLetterQueue)
									.set({
										status: "processing",
										lockedAt: claimedAt,
										lockedBy: workerId,
										updatedAt: claimedAt,
									})
									.where(eq(deadLetterQueue.id, jobId));

								return pending;
							});

							if (!row) return null;

							return mapJob({
								...row,
								status: "processing",
								lockedAt: claimedAt,
								lockedBy: workerId,
								updatedAt: claimedAt,
							});
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: `Failed to claim background job by ID: ${jobId}`,
								cause: e,
							}) as TQueueError,
					}),
				),

			completeClaimed: (jobId, workerId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(deadLetterQueue)
								.set({
									status: "resolved",
									lockedAt: null,
									lockedBy: null,
									nextAttemptAt: null,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(deadLetterQueue.id, jobId),
										eq(deadLetterQueue.lockedBy, workerId),
										eq(deadLetterQueue.status, "processing"),
									),
								);
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: `Failed to complete claimed background job: ${jobId}`,
								cause: e,
							}) as TQueueError,
					}).pipe(Effect.asVoid),
				),

			failClaimed: ({
				jobId,
				workerId,
				errorMessage,
				errorStack,
				retryCount,
				status,
				nextAttemptAt,
			}) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(deadLetterQueue)
								.set({
									status,
									errorMessage,
									errorStack,
									retryCount,
									nextAttemptAt,
									lockedAt: null,
									lockedBy: null,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(deadLetterQueue.id, jobId),
										eq(deadLetterQueue.lockedBy, workerId),
										eq(deadLetterQueue.status, "processing"),
									),
								);
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: `Failed to fail claimed background job: ${jobId}`,
								cause: e,
							}) as TQueueError,
					}).pipe(Effect.asVoid),
				),

			updateStatus: (
				jobId,
				status,
				errorMessage,
				errorStack,
				retryCount,
				nextAttemptAt,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const updateData: Partial<Record<string, unknown>> = {
								status,
								updatedAt: new Date().toISOString(),
							};

							if (errorMessage !== undefined)
								updateData.errorMessage = errorMessage;
							if (errorStack !== undefined) updateData.errorStack = errorStack;
							if (retryCount !== undefined) updateData.retryCount = retryCount;
							if (nextAttemptAt !== undefined)
								updateData.nextAttemptAt = nextAttemptAt;

							// Clear lock fields when transitioning out of "processing"
							if (status !== "processing") {
								updateData.lockedAt = null;
								updateData.lockedBy = null;
							}

							await db
								.update(deadLetterQueue)
								.set(updateData)
								.where(eq(deadLetterQueue.id, jobId));
						},
						catch: (e) =>
							({
								_tag: "QueueError",
								message: `Failed to update background job status for: ${jobId}`,
								cause: e,
							}) as TQueueError,
					}).pipe(Effect.asVoid),
				),
		}),
	),
);
