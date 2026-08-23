import { Context, type Effect } from "effect";

export type TQueueError = {
	readonly _tag: "QueueError";
	readonly message: string;
	readonly cause: unknown;
};

export type TJobStatus = "pending" | "processing" | "resolved" | "ignored";
export type TQueueWorkerId = string & { readonly _brand: "QueueWorkerId" };

export type TQueueProcessResult =
	| { readonly _tag: "Processed"; readonly jobId: string }
	| { readonly _tag: "NotClaimed"; readonly jobId: string }
	| {
			readonly _tag: "Ignored";
			readonly jobId: string;
			readonly reason: string;
	  };

export interface IJob {
	readonly id: string;
	readonly businessId: string | null;
	readonly operation: string;
	readonly payload: unknown;
	readonly errorMessage: string | null;
	readonly errorStack: string | null;
	readonly status: TJobStatus;
	readonly retryCount: number;
	readonly lockedAt: string | null;
	readonly lockedBy: string | null;
	readonly nextAttemptAt: string | null;
	readonly idempotencyKey: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
}

/**
 * Port: IQueue
 * Decoupled interface for background job queue operations.
 */
export interface IQueue {
	readonly enqueue: (
		operation: string,
		payload: unknown,
		businessId: string,
		idempotencyKey: string,
	) => Effect.Effect<string, TQueueError>;

	readonly findById: (jobId: string) => Effect.Effect<IJob | null, TQueueError>;

	readonly claimPending: (
		limit: number,
		workerId: TQueueWorkerId,
		now: Date,
	) => Effect.Effect<readonly IJob[], TQueueError>;

	readonly claimJob: (
		jobId: string,
		workerId: TQueueWorkerId,
		now: Date,
	) => Effect.Effect<IJob | null, TQueueError>;

	readonly completeClaimed: (
		jobId: string,
		workerId: TQueueWorkerId,
	) => Effect.Effect<void, TQueueError>;

	readonly failClaimed: (input: {
		readonly jobId: string;
		readonly workerId: TQueueWorkerId;
		readonly errorMessage: string;
		readonly errorStack: string | null;
		readonly retryCount: number;
		readonly status: "pending" | "ignored";
		readonly nextAttemptAt: string | null;
	}) => Effect.Effect<void, TQueueError>;

	readonly updateStatus: (
		jobId: string,
		status: TJobStatus,
		errorMessage?: string,
		errorStack?: string,
		retryCount?: number,
		nextAttemptAt?: string,
	) => Effect.Effect<void, TQueueError>;
}

export const IQueue = Context.GenericTag<IQueue>("IQueue");
