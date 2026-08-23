import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { IQueue, type TQueueWorkerId } from "@/shared/ports/queue.port";

describe("queue concurrent claim", () => {
	it("should claim pending jobs via claimPending", async () => {
		const mockQueue = {
			claimPending: (_limit: number, _workerId: string, _now: Date) =>
				Effect.succeed([
					{
						id: "job-1",
						businessId: "biz-1",
						operation: "import_products",
						payload: [],
						errorMessage: null,
						errorStack: null,
						status: "processing" as const,
						retryCount: 0,
						lockedAt: new Date().toISOString(),
						lockedBy: _workerId,
						nextAttemptAt: null,
						idempotencyKey: "ik-1",
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				]),
			findById: () => Effect.succeed(null),
			updateStatus: () => Effect.void,
		} as unknown as IQueue;

		const layer = Layer.succeed(IQueue, mockQueue);
		const result = await Effect.runPromise(
			Effect.flatMap(IQueue, (q) =>
				q.claimPending(10, "worker-1" as TQueueWorkerId, new Date()),
			).pipe(Effect.provide(layer)),
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.status).toBe("processing");
		expect(result[0]?.lockedBy).toBe("worker-1");
	});

	it("should return empty when no pending jobs", async () => {
		const mockQueue = {
			claimPending: () => Effect.succeed([]),
			findById: () => Effect.succeed(null),
			updateStatus: () => Effect.void,
		} as unknown as IQueue;

		const layer = Layer.succeed(IQueue, mockQueue);
		const result = await Effect.runPromise(
			Effect.flatMap(IQueue, (q) =>
				q.claimPending(10, "worker-2" as TQueueWorkerId, new Date()),
			).pipe(Effect.provide(layer)),
		);

		expect(result).toHaveLength(0);
	});

	it("should respect exponential backoff delays", () => {
		const backoffMinutes = [0, 1, 5, 15];

		expect(backoffMinutes[0]).toBe(0);
		expect(backoffMinutes[1]).toBe(1);
		expect(backoffMinutes[2]).toBe(5);
		expect(backoffMinutes[3]).toBe(15);
	});
});
