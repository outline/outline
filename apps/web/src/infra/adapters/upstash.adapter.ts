import { Redis } from "@upstash/redis";
import { Effect, Layer } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import { ICache, type TCacheError } from "@/shared/ports/cache.port";

export const UpstashCacheAdapterLive = Layer.effect(
	ICache,
	Effect.gen(function* () {
		const config = yield* IAppConfig;

		if (!config.upstash.redisUrl || !config.upstash.redisToken) {
			if (config.environment === "production") {
				const cacheUnavailable = (operation: string): TCacheError => ({
					_tag: "CacheError",
					message: `Upstash Redis is required for cache operation "${operation}"`,
					cause: new Error("UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN are required"),
				});

				console.error(
					"[Upstash Redis] URL and token are required in production. Cache operations will fail until Redis is configured.",
				);
				return ICache.of({
					get: <T>() => Effect.fail(cacheUnavailable("get")),
					set: () => Effect.fail(cacheUnavailable("set")),
					remove: () => Effect.fail(cacheUnavailable("remove")),
					clear: () => Effect.fail(cacheUnavailable("clear")),
				});
			}

			console.warn(
				"[Upstash Redis] Missing URL or token. Cache is disabled for non-production runtime.",
			);
			return ICache.of({
				get: () => Effect.succeed(null),
				set: () => Effect.void,
				remove: () => Effect.void,
				clear: () => Effect.void,
			});
		}

		const redis = new Redis({
			url: config.upstash.redisUrl,
			token: config.upstash.redisToken,
		});

		return ICache.of({
			get: (key) =>
				Effect.tryPromise({
					try: () => redis.get(key),
					catch: (e) =>
						({
							_tag: "CacheError",
							message: `Failed to get key "${key}" from Upstash`,
							cause: e,
						}) as TCacheError,
				}),

			set: (key, value, ttlSeconds) =>
				Effect.tryPromise({
					try: () =>
						redis.set(
							key,
							value,
							ttlSeconds !== undefined ? { ex: ttlSeconds } : undefined,
						),
					catch: (e) =>
						({
							_tag: "CacheError",
							message: `Failed to set key "${key}" in Upstash`,
							cause: e,
						}) as TCacheError,
				}).pipe(Effect.asVoid),

			remove: (key) =>
				Effect.tryPromise({
					try: () => redis.del(key),
					catch: (e) =>
						({
							_tag: "CacheError",
							message: `Failed to remove key "${key}" from Upstash`,
							cause: e,
						}) as TCacheError,
				}).pipe(Effect.asVoid),

			clear: () =>
				Effect.tryPromise({
					try: () => redis.flushdb(),
					catch: (e) =>
						({
							_tag: "CacheError",
							message: "Failed to clear Upstash cache",
							cause: e,
						}) as TCacheError,
				}).pipe(Effect.asVoid),
		});
	}),
);
