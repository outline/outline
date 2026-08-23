import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("seed endpoint authorization", () => {
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.resetModules();
		process.env.NODE_ENV = "test";
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it("should return 404 when NODE_ENV is production", async () => {
		process.env.NODE_ENV = "production";
		const { handlePostSeed } = await import("./seed");
		const request = new Request("http://localhost/api/v1/seed", {
			method: "POST",
			headers: { Authorization: "Bearer valid-owner-key" },
		});
		const response = await handlePostSeed(request);
		expect(response.status).toBe(404);
	});

	it("should return 401 when Authorization header is missing", async () => {
		const { handlePostSeed } = await import("./seed");
		const request = new Request("http://localhost/api/v1/seed", {
			method: "POST",
		});
		const response = await handlePostSeed(request);
		expect(response.status).toBe(401);
	});
});
