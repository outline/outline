import { Redis } from "@upstash/redis";
import { Effect, Layer } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import {
	IRateLimit,
	RateLimitError,
	type TRateLimitCheckInput,
	type TRateLimitCheckResult,
} from "@/shared/ports/rate-limit.port";
import { hashToken } from "@/shared/utils/hash";

type TStoredBucket = {
	readonly count: number;
	readonly resetAtMs: number;
};

const fallbackBuckets = new Map<string, TStoredBucket>();

export const toRateLimitResult = ({
	count,
	limit,
	ttlSeconds,
}: {
	readonly count: number;
	readonly limit: number;
	readonly ttlSeconds: number;
}): TRateLimitCheckResult =>
	count <= limit
		? { allowed: true, retryAfterSeconds: 0 }
		: {
				allowed: false,
				retryAfterSeconds: Math.max(1, ttlSeconds),
			};

const makeFallbackKey = ({ scope, key }: TRateLimitCheckInput): string =>
	`${scope}:${key}`;

const checkInMemoryFallback = (
	input: TRateLimitCheckInput,
	nowMs: number,
): TRateLimitCheckResult => {
	const key = makeFallbackKey(input);
	const existing = fallbackBuckets.get(key);

	if (!existing || existing.resetAtMs <= nowMs) {
		fallbackBuckets.set(key, {
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

	fallbackBuckets.set(key, { ...existing, count: existing.count + 1 });
	return { allowed: true, retryAfterSeconds: 0 };
};

const makeRedisKey = async ({
	scope,
	key,
}: TRateLimitCheckInput): Promise<string> =>
	`rate-limit:${scope}:${await hashToken(key)}`;

export const UpstashRateLimitAdapterLive = Layer.effect(
	IRateLimit,
	Effect.gen(function* () {
		const config = yield* IAppConfig;

		if (!config.upstash.redisUrl || !config.upstash.redisToken) {
			if (config.environment === "production") {
				console.error(
					"[RateLimit] Upstash URL and token are required in production. Requests will be denied until rate limiting is configured.",
				);
				return IRateLimit.of({
					check: () =>
						Effect.succeed({
							allowed: false,
							retryAfterSeconds: 60,
						}),
				});
			}

			console.warn(
				"[RateLimit] Missing Upstash URL or token. Using per-isolate in-memory rate limits for non-production runtime.",
			);
			return IRateLimit.of({
				check: (input) =>
					Effect.try({
						try: () => checkInMemoryFallback(input, Date.now()),
						catch: (cause) =>
							new RateLimitError("Failed to evaluate rate limit", {
								cause,
							}),
					}),
			});
		}

		const redis = new Redis({
			url: config.upstash.redisUrl,
			token: config.upstash.redisToken,
		});

		return IRateLimit.of({
			check: (input) =>
				Effect.tryPromise({
					try: async () => {
						const redisKey = await makeRedisKey(input);
						const count = await redis.incr(redisKey);
						if (count === 1) {
							await redis.expire(redisKey, input.windowSeconds);
						}

						const ttlSeconds =
							count > input.limit ? await redis.ttl(redisKey) : 0;

						return toRateLimitResult({
							count,
							limit: input.limit,
							ttlSeconds,
						});
					},
					catch: (cause) =>
						new RateLimitError("Failed to evaluate rate limit", { cause }),
				}),
		});
	}),
);
