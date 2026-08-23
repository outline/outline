import { Effect } from "effect";
import { runApp } from "@/infra/runtime/app.runtime";
import { IIdempotency } from "@/shared/ports/idempotency.port";
import type { TIdempotencyService } from "@/shared/utils/idempotency";

/**
 * Production-backed idempotency service that runs each I/O op through
 * `runApp` so the application layer's full adapter graph is in scope.
 */
export const idempotencyServiceFromAppLayer: TIdempotencyService = {
	find: (tenantId, idempotencyKey) =>
		Effect.promise(() =>
			runApp(
				Effect.gen(function* () {
					const idem = yield* IIdempotency;
					return yield* idem.find(tenantId, idempotencyKey);
				}),
			),
		),
	record: (
		tenantId,
		idempotencyKey,
		requestHash,
		responseBody,
		responseStatus,
	) =>
		Effect.promise(() =>
			runApp(
				Effect.gen(function* () {
					const idem = yield* IIdempotency;
					yield* idem.record(
						tenantId,
						idempotencyKey,
						requestHash,
						responseBody,
						responseStatus,
					);
				}),
			),
		),
};
