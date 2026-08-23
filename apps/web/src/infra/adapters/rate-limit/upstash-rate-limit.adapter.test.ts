import { describe, expect, it } from "vitest";
import { toRateLimitResult } from "./upstash-rate-limit.adapter";

describe("toRateLimitResult", () => {
	it("allows requests within limit", () => {
		expect(toRateLimitResult({ count: 3, limit: 3, ttlSeconds: 120 })).toEqual({
			allowed: true,
			retryAfterSeconds: 0,
		});
	});

	it("rejects requests over limit with ttl retry hint", () => {
		expect(toRateLimitResult({ count: 4, limit: 3, ttlSeconds: 120 })).toEqual({
			allowed: false,
			retryAfterSeconds: 120,
		});
	});

	it("falls back to one second retry hint when ttl is missing", () => {
		expect(toRateLimitResult({ count: 4, limit: 3, ttlSeconds: -1 })).toEqual({
			allowed: false,
			retryAfterSeconds: 1,
		});
	});
});
