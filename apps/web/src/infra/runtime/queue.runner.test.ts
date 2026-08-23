import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { IBranchRepository } from "@/domain/branch";
import { IBoardingRepository } from "@/domain/boarding/boarding.repository";
import { IProductRepository } from "@/domain/product/product.repository";
import { IStaffRepository } from "@/domain/staff/staff.repository";
import { IEmailPort } from "@/shared/ports/email.port";
import {
	type IJob,
	IQueue,
	type TQueueWorkerId,
} from "@/shared/ports/queue.port";
import { processJobProgram } from "./queue.runner";

// Mock the product program so we don't hit the DB/repository
vi.mock("@/domain/product/product.programs", () => ({
	importProductsProgram: vi
		.fn()
		.mockReturnValue(Effect.succeed({ imported: 5, skipped: 0, errors: [] })),
}));

describe("QueueRunner", () => {
	const mockJob: IJob = {
		id: "job-1",
		businessId: "business-1",
		operation: "import_products",
		payload: [{ name: "Test Product", price: 10, stock: 5 }],
		errorMessage: null,
		errorStack: null,
		status: "pending",
		retryCount: 0,
		lockedAt: null,
		lockedBy: null,
		nextAttemptAt: null,
		idempotencyKey: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const productRepoLayer = Layer.succeed(IProductRepository, {} as never);
	const boardingRepoLayer = Layer.succeed(IBoardingRepository, {} as never);
	const staffRepoLayer = Layer.succeed(IStaffRepository, {} as never);
	const branchRepoLayer = Layer.succeed(IBranchRepository, {} as never);
	const emailLayer = Layer.succeed(IEmailPort, {} as never);
	const repoLayer = Layer.mergeAll(
		productRepoLayer,
		boardingRepoLayer,
		staffRepoLayer,
		branchRepoLayer,
		emailLayer,
	);

	it("should succeed and mark the job as resolved", async () => {
		const claimJob = vi.fn(
			(_jobId: string, workerId: TQueueWorkerId, _now: Date) =>
				Effect.succeed({
					...mockJob,
					status: "processing" as const,
					lockedAt: new Date().toISOString(),
					lockedBy: workerId,
				}),
		);
		const completeClaimed = vi.fn().mockReturnValue(Effect.void);

		const queueLayer = Layer.succeed(IQueue, {
			enqueue: vi.fn(),
			findById: vi.fn(),
			claimPending: vi.fn(),
			claimJob,
			completeClaimed,
			failClaimed: vi.fn(),
			updateStatus: vi.fn(),
		});

		const program = processJobProgram("job-1");
		const fullLayer = Layer.mergeAll(queueLayer, repoLayer);
		await Effect.runPromise(Effect.provide(program, fullLayer));

		expect(claimJob).toHaveBeenCalledWith(
			"job-1",
			expect.stringMatching(/^worker:/),
			expect.any(Date),
		);
		expect(completeClaimed).toHaveBeenCalledWith(
			"job-1",
			expect.stringMatching(/^worker:/),
		);
	});

	it("should retry if job execution fails", async () => {
		// Import the mocked program so we can mock its failure
		const { importProductsProgram } = await import(
			"@/domain/product/product.programs"
		);
		vi.mocked(importProductsProgram).mockReturnValueOnce(
			Effect.fail(new Error("Database failure") as never),
		);

		const claimJob = vi.fn(
			(_jobId: string, workerId: TQueueWorkerId, _now: Date) =>
				Effect.succeed({
					...mockJob,
					status: "processing" as const,
					lockedAt: new Date().toISOString(),
					lockedBy: workerId,
					retryCount: 0,
				}),
		);
		const failClaimed = vi.fn().mockReturnValue(Effect.void);

		const queueLayer = Layer.succeed(IQueue, {
			enqueue: vi.fn(),
			findById: vi.fn(),
			claimPending: vi.fn(),
			claimJob,
			completeClaimed: vi.fn(),
			failClaimed,
			updateStatus: vi.fn(),
		});

		const program = processJobProgram("job-1");
		const fullLayer = Layer.mergeAll(queueLayer, repoLayer);
		await Effect.runPromise(Effect.provide(program, fullLayer));

		expect(failClaimed).toHaveBeenCalledWith({
			jobId: "job-1",
			workerId: expect.stringMatching(/^worker:/),
			status: "pending",
			errorMessage: "Database failure",
			errorStack: expect.any(String),
			retryCount: 1,
			nextAttemptAt: expect.any(String),
		});
	});

	it("should mark as ignored if max retries hit", async () => {
		const { importProductsProgram } = await import(
			"@/domain/product/product.programs"
		);
		vi.mocked(importProductsProgram).mockReturnValueOnce(
			Effect.fail(new Error("Another failure") as never),
		);

		// Start with retryCount = 3 (already retried 3 times), so the next attempt should be ignored
		const claimJob = vi.fn(
			(_jobId: string, workerId: TQueueWorkerId, _now: Date) =>
				Effect.succeed({
					...mockJob,
					status: "processing" as const,
					lockedAt: new Date().toISOString(),
					lockedBy: workerId,
					retryCount: 3,
				}),
		);
		const failClaimed = vi.fn().mockReturnValue(Effect.void);

		const queueLayer = Layer.succeed(IQueue, {
			enqueue: vi.fn(),
			findById: vi.fn(),
			claimPending: vi.fn(),
			claimJob,
			completeClaimed: vi.fn(),
			failClaimed,
			updateStatus: vi.fn(),
		});

		const program = processJobProgram("job-1");
		const fullLayer = Layer.mergeAll(queueLayer, repoLayer);
		await Effect.runPromise(Effect.provide(program, fullLayer));

		expect(failClaimed).toHaveBeenCalledWith({
			jobId: "job-1",
			workerId: expect.stringMatching(/^worker:/),
			status: "ignored",
			errorMessage: "Max retries hit. Last error: Another failure",
			errorStack: expect.any(String),
			retryCount: 4,
			nextAttemptAt: null,
		});
	});
});
