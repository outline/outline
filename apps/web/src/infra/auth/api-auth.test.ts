import { describe, expect, it } from "vitest";
import { hashToken, validateApiKey, withRateLimitHeaders } from "./api-auth";

describe("hashToken", () => {
	it("should produce a SHA-256 hash", async () => {
		const hash = await hashToken("test-key");
		expect(hash).toBeTruthy();
		expect(hash.length).toBe(64);
	});

	it("should produce deterministic output", async () => {
		const h1 = await hashToken("same-key");
		const h2 = await hashToken("same-key");
		expect(h1).toBe(h2);
	});

	it("should produce different hashes for different inputs", async () => {
		const h1 = await hashToken("key-a");
		const h2 = await hashToken("key-b");
		expect(h1).not.toBe(h2);
	});
});

describe("validateApiKey", () => {
	it("should return null when no auth header", async () => {
		const result = await validateApiKey(undefined);
		expect(result).toBeNull();
	});

	it("should return null when auth header is null", async () => {
		const result = await validateApiKey(null);
		expect(result).toBeNull();
	});

	it("should return null for non-Bearer header", async () => {
		const result = await validateApiKey("Basic xxx");
		expect(result).toBeNull();
	});

	it("should return null for empty Bearer token", async () => {
		const result = await validateApiKey("Bearer ");
		expect(result).toBeNull();
	});
});

describe("withRateLimitHeaders", () => {
	it("should add standard rate-limit headers", () => {
		const res = new Response("ok", { status: 200 });
		const enriched = withRateLimitHeaders(res, 100, 42);
		expect(enriched.headers.get("X-RateLimit-Limit")).toBe("100");
		expect(enriched.headers.get("X-RateLimit-Remaining")).toBe("42");
	});

	it("should preserve original body", async () => {
		const res = new Response(JSON.stringify({ data: "test" }), {
			status: 200,
		});
		const enriched = withRateLimitHeaders(res, 100, 50);
		const body = await enriched.json();
		expect(body).toEqual({ data: "test" });
	});
});

describe("timingSafeEqual", () => {
	it("should return true for equal strings", async () => {
		const { timingSafeEqual } = await import("./api-auth");
		expect(timingSafeEqual("abc", "abc")).toBe(true);
	});

	it("should return false for different strings", async () => {
		const { timingSafeEqual } = await import("./api-auth");
		expect(timingSafeEqual("abc", "xyz")).toBe(false);
	});

	it("should return false for different lengths", async () => {
		const { timingSafeEqual } = await import("./api-auth");
		expect(timingSafeEqual("abc", "abcd")).toBe(false);
	});
});
