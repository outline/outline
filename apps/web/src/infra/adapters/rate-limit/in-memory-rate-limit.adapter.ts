import { Effect, Layer } from "effect";
import {
	IRateLimit,
	RateLimitError,
	type TRateLimitCheckInput,
	type TRateLimitCheckResult,
} from "@/shared/ports/rate-limit.port";

type TBucket = {
	readonly count: number;
	readonly resetAtMs: number;
};

const buckets = new Map<string, TBucket>();

const bucketKey = ({ scope, key }: TRateLimitCheckInput): string =>
	`${scope}:${key}`;

const checkLimit = (
	input: TRateLimitCheckInput,
	nowMs: number,
): TRateLimitCheckResult => {
	const key = bucketKey(input);
	const existing = buckets.get(key);

	if (!existing || existing.resetAtMs <= nowMs) {
		buckets.set(key, {
			count: 1,
			resetAtMs: nowMs + input.windowSeconds * 1000,
		});
		return { allowed: true, retryAfterSeconds: 0 };
	}

	if (existing.count >= input.limit) {
		return {
			allowed: false,
			retryAfterSeconds: Math.max(
				1,
				Math.ceil((existing.resetAtMs - nowMs) / 1000),
			),
		};
	}

	buckets.set(key, { ...existing, count: existing.count + 1 });
	return { allowed: true, retryAfterSeconds: 0 };
};

export const InMemoryRateLimitAdapterLive = Layer.succeed(
	IRateLimit,
	IRateLimit.of({
		check: (input) =>
			Effect.try({
				try: () => checkLimit(input, Date.now()),
				catch: (cause) =>
					new RateLimitError("Failed to evaluate rate limit", { cause }),
			}),
	}),
);
