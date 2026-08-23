import { and, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { idempotencyKeys } from "@/infra/db/drizzle/schema";
import {
	IIdempotency,
	type TIdempotencyError,
	type TIdempotencyRecord,
} from "@/shared/ports/idempotency.port";

export const IdempotencyDrizzleLive = Layer.effect(
	IIdempotency,
	Effect.gen(function* () {
		const db = yield* IDrizzleClient;

		const errorFrom = (cause: unknown): TIdempotencyError => ({
			_tag: "IdempotencyError",
			message: "Idempotency record I/O failed.",
			cause,
		});

		return {
			find: (tenantId, idempotencyKey) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select({
								responseBody: idempotencyKeys.responseBody,
								responseStatus: idempotencyKeys.responseStatus,
								requestHash: idempotencyKeys.requestHash,
							})
							.from(idempotencyKeys)
							.where(
								and(
									eq(idempotencyKeys.businessId, tenantId),
									eq(idempotencyKeys.idempotencyKey, idempotencyKey),
								),
							)
							.limit(1);
						if (rows.length === 0) return null;
						const row = rows[0] as {
							responseBody: unknown;
							responseStatus: number;
							requestHash: string;
						};
						return {
							responseBody:
								typeof row.responseBody === "string"
									? row.responseBody
									: JSON.stringify(row.responseBody),
							responseStatus: row.responseStatus,
							requestHash: row.requestHash,
						} satisfies TIdempotencyRecord;
					},
					catch: errorFrom,
				}),

			record: (
				tenantId,
				idempotencyKey,
				requestHash,
				responseBody,
				responseStatus,
			) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.insert(idempotencyKeys)
							.values({
								businessId: tenantId,
								idempotencyKey,
								requestHash,
								responseBody,
								responseStatus,
							})
							.onConflictDoUpdate({
								target: [
									idempotencyKeys.businessId,
									idempotencyKeys.idempotencyKey,
								],
								set: {
									requestHash,
									responseBody,
									responseStatus,
								},
							});
					},
					catch: errorFrom,
				}).pipe(Effect.asVoid),
		};
	}),
);
