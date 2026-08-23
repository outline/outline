import { Effect } from "effect";
import type { ICache, TCacheError } from "@/shared/ports/cache.port";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Checks whether a key has already accumulated MAX_ATTEMPTS recorded
 * failures within the current window. Read-only — does not itself count
 * as an attempt. Call this BEFORE attempting a login, and only call
 * recordLoginFailure/resetLoginRateLimit AFTER you know the outcome, so
 * that repeated successful logins never count against the limit.
 */
export function isLoginRateLimited(
	cache: ICache,
	key: string,
): Effect.Effect<boolean, TCacheError> {
	return Effect.gen(function* () {
		const current = yield* cache.get<number>(key);
		return (current ?? 0) >= MAX_ATTEMPTS;
	});
}

/**
 * Call after a failed login attempt (wrong password or unknown email).
 * Not atomic (a get-then-set race under heavy concurrent load on the exact
 * same key could under-count by a request or two) — acceptable for slowing
 * down brute force, not exact enforcement. Do not reuse this for anything
 * that needs a hard guarantee (e.g. billing quotas).
 */
export function recordLoginFailure(
	cache: ICache,
	key: string,
): Effect.Effect<void, TCacheError> {
	return Effect.gen(function* () {
		const current = yield* cache.get<number>(key);
		yield* cache.set(key, (current ?? 0) + 1, WINDOW_SECONDS);
	});
}

/**
 * Call after a successful login to clear any accumulated failure count, so
 * a legitimate user who mistyped their password a few times before getting
 * it right isn't left one step from being locked out on their next login.
 */
export function resetLoginRateLimit(
	cache: ICache,
	key: string,
): Effect.Effect<void, TCacheError> {
	return cache.remove(key);
}
