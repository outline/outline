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

export type TIdempotencyReservation =
	| {
			readonly _tag: "Acquired";
			readonly reservationCreatedAt: string;
	  }
	| {
			readonly _tag: "InProgress";
			readonly requestHash: string;
	  }
	| {
			readonly _tag: "Completed";
			readonly record: TIdempotencyRecord;
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
 *  - `reserve` atomically inserts an in-progress row or returns the row that
 *    already owns the `(tenantId, idempotencyKey)` pair.
 *  - `complete` updates only the matching in-progress reservation and returns
 *    `false` instead of overwriting a completed or differently-owned row.
 *  - `release` deletes only the matching in-progress reservation after a
 *    handler failure, allowing a later retry to acquire the key.
 *
 * Cross-tenant scope is required because the keys live under a tenant's
 * data island; abusing the cache to enumerate another tenant's keys is
 * impossible by construction.
 */
export interface IIdempotency {
	readonly reserve: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
	) => Effect.Effect<TIdempotencyReservation, TIdempotencyError>;

	readonly complete: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
		responseBody: string,
		responseStatus: number,
		reservationCreatedAt: string,
	) => Effect.Effect<boolean, TIdempotencyError>;

	readonly release: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
		reservationCreatedAt: string,
	) => Effect.Effect<boolean, TIdempotencyError>;
}

export const IIdempotency = Context.GenericTag<IIdempotency>("IIdempotency");
