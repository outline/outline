import { Effect } from "effect";
import { importBoardingsProgram } from "@/domain/boarding/boarding.programs";
import type { CreateBoardingCommand } from "@/domain/boarding/boarding.schemas";
import { importProductsProgram } from "@/domain/product/product.programs";
import type { CreateVariantCommand } from "@/domain/product/product.schemas";
import { inviteStaffBatchProgram } from "@/domain/staff/staff.programs";
import type { InviteStaffCommand } from "@/domain/staff/staff.schemas";
import { logAuditEvent } from "@/lib/api/audit.functions";
import {
	type IJob,
	IQueue,
	type TQueueWorkerId,
} from "@/shared/ports/queue.port";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { runApp } from "./app.runtime";

export type { TQueueWorkerId } from "@/shared/ports/queue.port";

/** Backoff delays in minutes keyed by current retryCount. */
const BACKOFF_MINUTES: Record<number, number> = {
	0: 1,
	1: 5,
	2: 15,
};

const makeWorkerId = (): TQueueWorkerId =>
	`worker:${crypto.randomUUID()}` as TQueueWorkerId;

const executeClaimedJobProgram = (job: IJob, workerId: TQueueWorkerId) =>
	Effect.gen(function* () {
		const queue = yield* IQueue;

		if (job.status !== "processing" || job.lockedBy !== workerId) {
			return {
				_tag: "Ignored",
				jobId: job.id,
				reason: "Job is not claimed by this worker.",
			} as const;
		}

		console.log(
			`[Background Queue] Processing job ${job.id} (${job.operation})`,
		);

		let executionResult:
			| { _tag: "Left"; left: unknown }
			| { _tag: "Right"; right: unknown };

		if (job.operation === "import_products") {
			const payload = job.payload as readonly CreateVariantCommand[];
			const businessId = job.businessId as TTenantId;

			executionResult = yield* Effect.either(
				importProductsProgram(payload, businessId),
			);
		} else if (job.operation === "invite_staff_batch") {
			const payload = job.payload as readonly InviteStaffCommand[];
			const businessId = job.businessId as TTenantId;

			executionResult = yield* Effect.either(
				inviteStaffBatchProgram(payload, businessId),
			);
		} else if (job.operation === "import_boardings") {
			const payload = job.payload as {
				readonly commands: readonly CreateBoardingCommand[];
				readonly userId: string;
			};
			const businessId = job.businessId as TTenantId;

			executionResult = yield* Effect.either(
				importBoardingsProgram(
					payload.commands,
					businessId,
					payload.userId as TUserId,
				),
			);
		} else {
			executionResult = {
				_tag: "Left",
				left: new Error(`Unknown background queue operation: ${job.operation}`),
			};
		}

		if (executionResult._tag === "Right") {
			const result = executionResult.right as {
				readonly imported: number;
				readonly skipped: number;
			};
			console.log(
				`[Background Queue] Job ${job.id} (${job.operation}) completed successfully:`,
				`Imported=${result.imported}, Skipped=${result.skipped}`,
			);

			yield* queue.completeClaimed(job.id, workerId);
			return { _tag: "Processed", jobId: job.id } as const;
		} else {
			const error = executionResult.left;
			console.error(
				`[Background Queue] Error processing job ${job.id}:`,
				error,
			);

			const errMessage =
				error instanceof Error
					? error.message
					: error && typeof error === "object" && "_tag" in error
						? String(error._tag)
						: String(error);
			const errStack = error instanceof Error ? (error.stack ?? null) : null;
			const nextRetryCount = job.retryCount + 1;

			if (job.retryCount >= 3) {
				yield* queue.failClaimed({
					jobId: job.id,
					workerId,
					status: "ignored",
					errorMessage: `Max retries hit. Last error: ${errMessage}`,
					errorStack: errStack,
					retryCount: nextRetryCount,
					nextAttemptAt: null,
				});

				yield* Effect.sync(() => {
					logAuditEvent(
						job.businessId as TTenantId,
						"" as TUserId,
						"queue_dlq",
						"queue_job",
						job.id,
						undefined,
						{ operation: job.operation, error: errMessage },
					).catch(() => {});
				});

				return {
					_tag: "Ignored",
					jobId: job.id,
					reason: `Max retries hit. Last error: ${errMessage}`,
				} as const;
			} else {
				const backoffMin = BACKOFF_MINUTES[job.retryCount] ?? 15;
				const nextAttemptAt = new Date(
					Date.now() + backoffMin * 60 * 1000,
				).toISOString();

				yield* queue.failClaimed({
					jobId: job.id,
					workerId,
					status: "pending",
					errorMessage: errMessage,
					errorStack: errStack,
					retryCount: nextRetryCount,
					nextAttemptAt,
				});

				return {
					_tag: "Ignored",
					jobId: job.id,
					reason: errMessage,
				} as const;
			}
		}
	});

export const claimAndProcessJobProgram = (
	jobId: string,
	workerId: TQueueWorkerId,
	now: Date = new Date(),
) =>
	Effect.gen(function* () {
		const queue = yield* IQueue;
		const job = yield* queue.claimJob(jobId, workerId, now);
		if (!job) return { _tag: "NotClaimed", jobId } as const;
		return yield* executeClaimedJobProgram(job, workerId);
	});

/**
 * Program: processJobProgram
 * Backward-compatible entry point that always claims before executing.
 */
export const processJobProgram = (jobId: string) =>
	Effect.asVoid(claimAndProcessJobProgram(jobId, makeWorkerId()));

/**
 * Trigger background process asynchronously.
 * Supports Cloudflare Workers waitUntil(promise) in production, and standard Bun/Node event loop locally.
 */
export const triggerBackgroundProcess = (
	jobId: string,
	ctx?: { readonly waitUntil: (promise: Promise<unknown>) => void },
) => {
	const promise = runApp(claimAndProcessJobProgram(jobId, makeWorkerId()));

	if (ctx?.waitUntil) {
		ctx.waitUntil(promise);
	} else {
		promise.catch((err) => {
			console.error(
				`[Background Queue] Async job execution failed for ${jobId}:`,
				err,
			);
		});
	}
};
