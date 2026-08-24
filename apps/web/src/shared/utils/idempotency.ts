import { Effect } from "effect";
import type {
	TIdempotencyRecord,
	TIdempotencyReservation,
} from "@/shared/ports/idempotency.port";
import { hashToken } from "@/shared/utils/hash";

export type { TIdempotencyRecord };

/** Raised when a request does not provide a valid idempotency key. */
export class IdempotencyMissingKeyError extends Error {
	override readonly name = "IdempotencyMissingKeyError";
	constructor() {
		super("Idempotency-Key wajib dikirim.");
	}
}

/** Raised when an idempotency key is reused with a different payload. */
export class IdempotencyConflictError extends Error {
	readonly status = 409;
	readonly code = "idempotency_conflict";
	override readonly name = "IdempotencyConflictError";
	constructor() {
		super(
			"Idempotency-Key sudah digunakan dengan payload yang berbeda. Tolong gunakan key baru atau kirim ulang dengan payload asli.",
		);
	}
}

/** Raised when a matching idempotent request is already being processed. */
export class IdempotencyRequestInProgressError extends Error {
	readonly status = 409;
	readonly code = "request_in_progress";
	override readonly name = "IdempotencyRequestInProgressError";
	constructor() {
		super("Permintaan dengan Idempotency-Key ini masih diproses.");
	}
}

class IdempotencyCompletionError extends Error {
	override readonly name = "IdempotencyCompletionError";
	constructor() {
		super("Idempotency reservation could not be completed.");
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
			if (v === undefined) {
				continue;
			}
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
	readonly reserve: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
	) => Effect.Effect<TIdempotencyReservation, never, never>;
	readonly complete: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
		responseBody: string,
		responseStatus: number,
		reservationCreatedAt: string,
	) => Effect.Effect<boolean, never, never>;
	readonly release: (
		tenantId: string,
		idempotencyKey: string,
		requestHash: string,
		reservationCreatedAt: string,
	) => Effect.Effect<boolean, never, never>;
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
 * 2. The `(tenantId, idempotencyKey)` pair is atomically reserved before the
 *    handler runs.
 * 3. If a completed record has a matching `requestHash`, its response is
 *    replayed. A matching in-progress record is rejected immediately.
 * 4. If the reserved or completed record has a different hash, the helper
 *    throws `IdempotencyConflictError` to signal a client bug.
 * 5. Otherwise, the handler runs and completion is durably persisted before
 *    the live return value is propagated.
 *
 * `service` decouples persistence from this helper so callers may inject
 * either the live Drizzle adapter (default), a wrapped-via-`runApp`
 * variant, or a test fake — without leaking Effect runtime requirements
 * out of `shared/`.
 *
 * `tenantId` must be the server-resolved value (here: the tenant selected
 * via the public slug), **never** a client-supplied field.
 */
export const runWithIdempotency = async <A>(
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
		throw new IdempotencyMissingKeyError();
	}

	const requestHash = await hashIdempotencyPayload(requestPayload);
	const reservation = await Effect.runPromise(
		service.reserve(tenantId, idempotencyKey, requestHash),
	);

	if (reservation._tag === "Completed") {
		if (reservation.record.requestHash !== requestHash) {
			throw new IdempotencyConflictError();
		}
		return JSON.parse(reservation.record.responseBody) as A;
	}
	if (reservation._tag === "InProgress") {
		if (reservation.requestHash !== requestHash) {
			throw new IdempotencyConflictError();
		}
		throw new IdempotencyRequestInProgressError();
	}

	let result: A;
	try {
		result = await handler();
	} catch (error) {
		await Effect.runPromise(
			service.release(
				tenantId,
				idempotencyKey,
				requestHash,
				reservation.reservationCreatedAt,
			),
		);
		throw error;
	}
	const responseBody = JSON.stringify(result);
	if (responseBody === undefined) {
		throw new IdempotencyCompletionError();
	}
	const completed = await Effect.runPromise(
		service.complete(
			tenantId,
			idempotencyKey,
			requestHash,
			responseBody,
			200,
			reservation.reservationCreatedAt,
		),
	);
	if (!completed) {
		throw new IdempotencyCompletionError();
	}
	return result;
};
