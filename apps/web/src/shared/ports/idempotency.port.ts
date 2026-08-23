import { Context, type Effect } from "effect";

export type TIdempotencyError = {
	readonly _tag: "IdempotencyError";
	readonly message: string;
	readonly cause: unknown;
};

/**
 * Cached response for an idempotency-key replay.
 *
 * `requestHash` records the SHA-256 hex digest of the normalised request
 * payload that produced the cached response. If a retry sends the same
 * idempotency key but with a different request hash, the caller can detect
 * the conflict and return 409 to the client.
 */
export type TIdempotencyRecord = {
	readonly responseBody: string;
	readonly responseStatus: number;
	readonly requestHash: string;
};

/**
 * Port: IIdempotency
 * Persists idempotency records keyed by `(tenantId, idempotencyKey)`.
 *
 * Used to make public POST endpoints (booking, boarding submission) safe
 * against double-submission. The first call wins; subsequent calls with
 * the same key + matching request hash replay the cached response.
 *
 * Storage contract:
 *  - `find` returns `null` for an unknown key (not `Effect.fail`).
 *  - `record` upserts; uniqueness is enforced by the DB composite index
 *    on `(tenant_id, idempotency_key)`.
 *
 * Cross-tenant scope is required because the keys live under a tenant's
 * data island; abusing the cache to enumerate another tenant's keys is
 * impossible by construction.
 */
export interface IIdempotency {
	readonly find: (
		tenantId: string,
		idempotencyKey: string,
	) => Effect.Effect<TIdempotencyRecord | null, TIdempotencyError>;

	readonly record: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
		responseBody: string,
		responseStatus: number,
	) => Effect.Effect<void, TIdempotencyError>;
}

export const IIdempotency = Context.GenericTag<IIdempotency>("IIdempotency");
