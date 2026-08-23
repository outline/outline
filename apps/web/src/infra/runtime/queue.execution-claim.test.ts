import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { IBranchRepository } from "@/domain/branch";
import { IBoardingRepository } from "@/domain/boarding/boarding.repository";
import { IProductRepository } from "@/domain/product/product.repository";
import { IStaffRepository } from "@/domain/staff/staff.repository";
import { IEmailPort } from "@/shared/ports/email.port";
import { IQueue } from "@/shared/ports/queue.port";
import { claimAndProcessJobProgram, type TQueueWorkerId } from "./queue.runner";

describe("queue execution claim", () => {
	it("does not execute when claimJob returns null", async () => {
		const claimJob = vi.fn(() => Effect.succeed(null));
		const completeClaimed = vi.fn(() => Effect.void);
		const failClaimed = vi.fn(() => Effect.void);

		const layer = Layer.succeed(IQueue, {
			enqueue: vi.fn(),
			findById: vi.fn(),
			claimPending: vi.fn(),
			updateStatus: vi.fn(),
			claimJob,
			completeClaimed,
			failClaimed,
		} satisfies IQueue);
		const repoLayer = Layer.mergeAll(
			Layer.succeed(IProductRepository, {} as never),
			Layer.succeed(IBoardingRepository, {} as never),
			Layer.succeed(IStaffRepository, {} as never),
			Layer.succeed(IBranchRepository, {} as never),
			Layer.succeed(IEmailPort, {} as never),
		);

		const result = await Effect.runPromise(
			Effect.provide(
				claimAndProcessJobProgram("job-1", "worker-a" as TQueueWorkerId),
				Layer.mergeAll(layer, repoLayer),
			),
		);

		expect(result).toEqual({ _tag: "NotClaimed", jobId: "job-1" });
		expect(completeClaimed).not.toHaveBeenCalled();
		expect(failClaimed).not.toHaveBeenCalled();
	});
});
