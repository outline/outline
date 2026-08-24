import { Effect } from "effect";
import { runApp } from "@/infra/runtime/app.runtime";
import { IIdempotency } from "@/shared/ports/idempotency.port";
import type { TIdempotencyService } from "@/shared/utils/idempotency";

/**
 * Production-backed idempotency service that runs each I/O op through
 * `runApp` so the application layer's full adapter graph is in scope.
 */
export const idempotencyServiceFromAppLayer: TIdempotencyService = {
	reserve: (tenantId, idempotencyKey, requestHash) =>
		Effect.promise(() =>
			runApp(
				Effect.gen(function* () {
					const idem = yield* IIdempotency;
					return yield* idem.reserve(tenantId, idempotencyKey, requestHash);
				}),
			),
		),
	complete: (
		tenantId,
		idempotencyKey,
		requestHash,
		responseBody,
		responseStatus,
		reservationCreatedAt,
	) =>
		Effect.promise(() =>
			runApp(
				Effect.gen(function* () {
					const idem = yield* IIdempotency;
					return yield* idem.complete(
						tenantId,
						idempotencyKey,
						requestHash,
						responseBody,
						responseStatus,
						reservationCreatedAt,
					);
				}),
			),
		),
	release: (tenantId, idempotencyKey, requestHash, reservationCreatedAt) =>
		Effect.promise(() =>
			runApp(
				Effect.gen(function* () {
					const idem = yield* IIdempotency;
					return yield* idem.release(
						tenantId,
						idempotencyKey,
						requestHash,
						reservationCreatedAt,
					);
				}),
			),
		),
};
