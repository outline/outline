import { describe, expect, it } from "vitest";
import { getBranchId, getRequestId } from "./request-context";

describe("REST request context", () => {
	it("preserves a caller-provided request id", () => {
		const request = new Request("https://pet-store.test/api/v1/health", {
			headers: { "X-Request-Id": "request-123" },
		});

		expect(getRequestId(request)).toBe("request-123");
	});

	it("generates a request id when the caller did not provide one", () => {
		const request = new Request("https://pet-store.test/api/v1/health");

		expect(getRequestId(request)).toMatch(/^[0-9a-f-]{36}$/);
	});

	it("reads the active branch header", () => {
		const request = new Request("https://pet-store.test/api/v1/products", {
			headers: { "X-Branch-Id": "branch-123" },
		});

		expect(getBranchId(request)).toBe("branch-123");
	});
});
