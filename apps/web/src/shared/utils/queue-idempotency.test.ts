import { describe, expect, it } from "vitest";
import { makeQueueIdempotencyKey } from "./queue-idempotency";

describe("makeQueueIdempotencyKey", () => {
	it("builds a deterministic tenant-scoped queue idempotency key", () => {
		expect(
			makeQueueIdempotencyKey({
				tenantId: "tenant-1",
				operation: "import_products",
				importRequestId: "  request-1  ",
			}),
		).toBe("tenant-1:import_products:request-1");
	});
});
