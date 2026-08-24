import { and, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { idempotencyKeys } from "@/infra/db/drizzle/schema";
import {
	IIdempotency,
	type TIdempotencyError,
	type TIdempotencyRecord,
	type TIdempotencyReservation,
} from "@/shared/ports/idempotency.port";

const reservationFromRow = (row: {
	readonly responseBody: unknown;
	readonly responseStatus: number;
	readonly requestHash: string;
}): TIdempotencyReservation => {
	if (row.responseStatus === 0) {
		return {
			_tag: "InProgress",
			requestHash: row.requestHash,
		};
	}
	return {
		_tag: "Completed",
		record: {
			responseBody:
				typeof row.responseBody === "string"
					? row.responseBody
					: JSON.stringify(row.responseBody),
			responseStatus: row.responseStatus,
			requestHash: row.requestHash,
		} satisfies TIdempotencyRecord,
	};
};

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
			reserve: (tenantId, idempotencyKey, requestHash) =>
				Effect.tryPromise({
					try: async () => {
						const findReservation = async () => {
							const rows = await db
								.select({
									responseBody: idempotencyKeys.responseBody,
									responseStatus: idempotencyKeys.responseStatus,
									requestHash: idempotencyKeys.requestHash,
									createdAt: idempotencyKeys.createdAt,
								})
								.from(idempotencyKeys)
								.where(
									and(
										eq(idempotencyKeys.businessId, tenantId),
										eq(idempotencyKeys.idempotencyKey, idempotencyKey),
									),
								)
								.limit(1);
							return rows[0];
						};

						const inserted = await db
							.insert(idempotencyKeys)
							.values({
								businessId: tenantId,
								idempotencyKey,
								requestHash,
								responseBody: "null",
								responseStatus: 0,
							})
							.onConflictDoNothing({
								target: [
									idempotencyKeys.businessId,
									idempotencyKeys.idempotencyKey,
								],
							})
							.returning({ createdAt: idempotencyKeys.createdAt });
						const insertedReservation = inserted[0];
						if (insertedReservation) {
							return {
								_tag: "Acquired",
								reservationCreatedAt: insertedReservation.createdAt,
							} as const;
						}

						const row = await findReservation();
						if (!row) {
							throw new Error("Idempotency reservation disappeared.");
						}
						if (row.responseStatus === 0 && row.requestHash === requestHash) {
							const reclaimed = await db
								.update(idempotencyKeys)
								.set({ createdAt: sql`now()` })
								.where(
									and(
										eq(idempotencyKeys.businessId, tenantId),
										eq(idempotencyKeys.idempotencyKey, idempotencyKey),
										eq(idempotencyKeys.requestHash, requestHash),
										eq(idempotencyKeys.responseStatus, 0),
										eq(idempotencyKeys.createdAt, row.createdAt),
										sql`${idempotencyKeys.createdAt} < now() - interval '5 minutes'`,
									),
								)
								.returning({ createdAt: idempotencyKeys.createdAt });
							const reclaimedReservation = reclaimed[0];
							if (reclaimedReservation) {
								return {
									_tag: "Acquired",
									reservationCreatedAt: reclaimedReservation.createdAt,
								} as const;
							}

							const latest = await findReservation();
							if (!latest) {
								throw new Error("Idempotency reservation disappeared.");
							}
							return reservationFromRow(latest);
						}
						return reservationFromRow(row);
					},
					catch: errorFrom,
				}),

			complete: (
				tenantId,
				idempotencyKey,
				requestHash,
				responseBody,
				responseStatus,
				reservationCreatedAt,
			) =>
				Effect.tryPromise({
					try: async () => {
						const completed = await db
							.update(idempotencyKeys)
							.set({
								responseBody,
								responseStatus,
							})
							.where(
								and(
									eq(idempotencyKeys.businessId, tenantId),
									eq(idempotencyKeys.idempotencyKey, idempotencyKey),
									eq(idempotencyKeys.requestHash, requestHash),
									eq(idempotencyKeys.responseStatus, 0),
									eq(idempotencyKeys.createdAt, reservationCreatedAt),
								),
							)
							.returning({ id: idempotencyKeys.id });
						return completed.length === 1;
					},
					catch: errorFrom,
				}),

			release: (tenantId, idempotencyKey, requestHash, reservationCreatedAt) =>
				Effect.tryPromise({
					try: async () => {
						const released = await db
							.delete(idempotencyKeys)
							.where(
								and(
									eq(idempotencyKeys.businessId, tenantId),
									eq(idempotencyKeys.idempotencyKey, idempotencyKey),
									eq(idempotencyKeys.requestHash, requestHash),
									eq(idempotencyKeys.responseStatus, 0),
									eq(idempotencyKeys.createdAt, reservationCreatedAt),
								),
							)
							.returning({ id: idempotencyKeys.id });
						return released.length === 1;
					},
					catch: errorFrom,
				}),
		};
	}),
);
