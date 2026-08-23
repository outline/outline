import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { ICache } from "@/shared/ports/cache.port";
import {
	isLoginRateLimited,
	recordLoginFailure,
	resetLoginRateLimit,
} from "./rate-limiter";

function makeInMemoryCache(): ICache {
	const store = new Map<string, unknown>();
	return {
		get: (key) => Effect.succeed((store.get(key) as never) ?? null),
		set: (key, value) => {
			store.set(key, value);
			return Effect.void;
		},
		remove: (key) => {
			store.delete(key);
			return Effect.void;
		},
		clear: () => {
			store.clear();
			return Effect.void;
		},
	};
}

describe("login rate limiter", () => {
	it("is not rate limited before any recorded failures", async () => {
		const cache = makeInMemoryCache();
		const limited = await Effect.runPromise(
			isLoginRateLimited(cache, "login:test@example.com"),
		);
		expect(limited).toBe(false);
	});

	it("rate limits after 5 recorded failures, not before", async () => {
		const cache = makeInMemoryCache();
		const key = "login:test@example.com";
		for (let i = 0; i < 5; i++) {
			const limitedBefore = await Effect.runPromise(
				isLoginRateLimited(cache, key),
			);
			expect(limitedBefore).toBe(false);
			await Effect.runPromise(recordLoginFailure(cache, key));
		}
		const limitedAfter = await Effect.runPromise(
			isLoginRateLimited(cache, key),
		);
		expect(limitedAfter).toBe(true);
	});

	it("tracks different keys independently", async () => {
		const cache = makeInMemoryCache();
		for (let i = 0; i < 5; i++) {
			await Effect.runPromise(recordLoginFailure(cache, "login:a@example.com"));
		}
		const otherKeyLimited = await Effect.runPromise(
			isLoginRateLimited(cache, "login:b@example.com"),
		);
		expect(otherKeyLimited).toBe(false);
	});

	it("resetLoginRateLimit clears an accumulated failure count", async () => {
		const cache = makeInMemoryCache();
		const key = "login:test@example.com";
		for (let i = 0; i < 5; i++) {
			await Effect.runPromise(recordLoginFailure(cache, key));
		}
		expect(await Effect.runPromise(isLoginRateLimited(cache, key))).toBe(true);

		await Effect.runPromise(resetLoginRateLimit(cache, key));

		expect(await Effect.runPromise(isLoginRateLimited(cache, key))).toBe(false);
	});
});
