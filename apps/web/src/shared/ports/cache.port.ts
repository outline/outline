import { Context, type Effect } from "effect";

export type TCacheError = {
	readonly _tag: "CacheError";
	readonly message: string;
	readonly cause: unknown;
};

/**
 * Port: ICache
 * Standardized interface for key-value storage.
 */
export interface ICache {
	readonly get: <T>(key: string) => Effect.Effect<T | null, TCacheError>;
	readonly set: <T>(
		key: string,
		value: T,
		ttlSeconds?: number,
	) => Effect.Effect<void, TCacheError>;
	readonly remove: (key: string) => Effect.Effect<void, TCacheError>;
	readonly clear: () => Effect.Effect<void, TCacheError>;
}

export const ICache = Context.GenericTag<ICache>("ICache");
