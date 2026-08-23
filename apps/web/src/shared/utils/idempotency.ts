import { Effect } from "effect";
import type { TIdempotencyRecord } from "@/shared/ports/idempotency.port";
import { hashToken } from "@/shared/utils/hash";

export type { TIdempotencyRecord };

/**
 * Idempotency-related tagged errors used by `runWithIdempotency`.
 */
export class IdempotencyMissingKeyError extends Error {
	override readonly name = "IdempotencyMissingKeyError";
	constructor() {
		super("Idempotency-Key wajib dikirim.");
	}
}

export class IdempotencyConflictError extends Error {
	override readonly name = "IdempotencyConflictError";
	constructor() {
		super(
			"Idempotency-Key sudah digunakan dengan payload yang berbeda. Tolong gunakan key baru atau kirim ulang dengan payload asli.",
		);
	}
}

/**
 * Canonical JSON serialiser used to fingerprint idempotency payloads.
 *
 * - Object keys are sorted recursively so that `{a:1,b:2}` and
 *   `{b:2,a:1}` produce identical strings.
 * - `undefined` values are dropped (consistent with the rest of the
 *   codebase's `exactOptionalPropertyTypes`-friendly style).
 * - `Date` instances are coerced to their ISO strings so values sent
 *   across a network boundary hash identically to the server-side
 *   reconstruction.
 *
 * If your payload legitimately needs exact preservation of `bigint`,
 * redesign the payload to a string at the boundary — `JSON.stringify`
 * will not reliably round-trip BigInt without a custom replacer.
 */
export const canonicalJson = (value: unknown): string => {
	const seen = new WeakSet<object>();

	const walk = (node: unknown): unknown => {
		if (node === null || typeof node !== "object") {
			return node;
		}
		if (node instanceof Date) {
			return { __type: "Date", value: node.toISOString() };
		}
		if (seen.has(node as object)) {
			return { __type: "CircularRef" };
		}
		seen.add(node as object);

		if (Array.isArray(node)) {
			return node.map(walk);
		}
		const obj = node as Record<string, unknown>;
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(obj).sort()) {
			const v = obj[key];
			if (v === undefined) continue;
			out[key] = walk(v);
		}
		return out;
	};

	return JSON.stringify(walk(value));
};

export const hashIdempotencyPayload = async (
	payload: unknown,
): Promise<string> => hashToken(canonicalJson(payload));

export type TIdempotencyService = {
	readonly find: (
		tenantId: string,
		idempotencyKey: string,
	) => Effect.Effect<TIdempotencyRecord | null, never, never>;
	readonly record: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
		responseBody: string,
		responseStatus: number,
	) => Effect.Effect<void, never, never>;
};

export type TRunWithIdempotencyOptions = {
	readonly tenantId: string;
	readonly idempotencyKey: string | undefined;
	readonly requestPayload: unknown;
};

/**
 * `runWithIdempotency` wraps a public POST handler so that:
 *
 * 1. If `idempotencyKey` is missing, the helper throws
 *    `IdempotencyMissingKeyError` (typed boundary).
 * 2. If the `(tenantId, idempotencyKey)` pair has a cached record with a
 *    matching `requestHash`, the cached response is replayed.
 * 3. If the cached record exists but `requestHash` differs, the helper
 *    throws `IdempotencyConflictError` to signal a client bug.
 * 4. Otherwise, the handler runs, its return value is JSON-serialised,
 *    the record is upserted via `service`, and the live return value
 *    is propagated.
 *
 * `service` decouples persistence from this helper so callers may inject
 * either the live Drizzle adapter (default), a wrapped-via-`runApp`
 * variant, or a test fake — without leaking Effect runtime requirements
 * out of `shared/`.
 *
 * `tenantId` must be the server-resolved value (here: the tenant selected
 * via the public slug), **never** a client-supplied field.
 */
export const runWithIdempotency = <A>(
	options: TRunWithIdempotencyOptions,
	handler: () => Promise<A>,
	service: TIdempotencyService,
): Promise<A> => {
	const { tenantId, idempotencyKey, requestPayload } = options;

	if (
		typeof idempotencyKey !== "string" ||
		idempotencyKey.trim().length < 8 ||
		idempotencyKey.length > 200
	) {
		return Promise.reject(new IdempotencyMissingKeyError());
	}

	const requestHashP = hashIdempotencyPayload(requestPayload);
	const existingP = Effect.runPromise(service.find(tenantId, idempotencyKey));

	return requestHashP.then((requestHash) =>
		existingP.then((existing) => {
			if (existing) {
				if (existing.requestHash !== requestHash) {
					throw new IdempotencyConflictError();
				}
				return JSON.parse(existing.responseBody) as A;
			}

			return handler().then((result) => {
				const body = JSON.stringify(result);
				Effect.runPromise(
					service.record(tenantId, idempotencyKey, requestHash, body, 200),
				).catch((error) => {
					console.error(
						"[runWithIdempotency] Failed to persist record:",
						error,
					);
				});
				return result;
			});
		}),
	);
};
