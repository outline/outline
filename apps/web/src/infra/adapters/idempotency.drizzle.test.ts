// @vitest-environment node
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { idempotencyKeys } from "@/infra/db/drizzle/schema";
import { IIdempotency } from "@/shared/ports/idempotency.port";
import { IdempotencyDrizzleLive } from "./idempotency.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);
const tenantId = crypto.randomUUID();
const key = `booking-${crypto.randomUUID()}`;
const requestHash = "a".repeat(64);
const idempotencyLayer = Layer.provide(
	IdempotencyDrizzleLive,
	DrizzleClientLive,
);

const runIdempotency = <A, E>(effect: Effect.Effect<A, E, IIdempotency>) =>
	Effect.runPromise(Effect.provide(effect, idempotencyLayer));

const runDb = <A, E>(effect: Effect.Effect<A, E, IDrizzleClient>) =>
	Effect.runPromise(Effect.provide(effect, DrizzleClientLive));

describe.skipIf(!hasDb)("idempotency drizzle adapter", () => {
	afterEach(async () => {
		await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const db = yield* IDrizzleClient;
					yield* Effect.promise(() =>
						db
							.delete(idempotencyKeys)
							.where(eq(idempotencyKeys.businessId, tenantId)),
					);
				}),
				DrizzleClientLive,
			),
		);
	});

	it("atomically grants only one concurrent reservation for the same key", async () => {
		const reserve = () =>
			runIdempotency(
				Effect.gen(function* () {
					const idempotency = yield* IIdempotency;
					return yield* idempotency.reserve(tenantId, key, requestHash);
				}),
			);

		const reservations = await Promise.all([reserve(), reserve()]);
		expect(reservations.map((reservation) => reservation._tag).sort()).toEqual([
			"Acquired",
			"InProgress",
		]);
	});

	it("completes only the matching reservation and replays its result", async () => {
		const reservation = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.reserve(tenantId, key, requestHash);
			}),
		);
		expect(reservation._tag).toBe("Acquired");
		if (reservation._tag !== "Acquired") {
			throw new Error("Expected to acquire the reservation.");
		}

		const mismatchedCompletion = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.complete(
					tenantId,
					key,
					"b".repeat(64),
					'{"bookingId":"wrong"}',
					200,
					reservation.reservationCreatedAt,
				);
			}),
		);
		expect(mismatchedCompletion).toBe(false);

		const completed = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.complete(
					tenantId,
					key,
					requestHash,
					'{"bookingId":"B-1"}',
					201,
					reservation.reservationCreatedAt,
				);
			}),
		);
		expect(completed).toBe(true);

		const replay = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.reserve(tenantId, key, requestHash);
			}),
		);
		expect(replay).toEqual({
			_tag: "Completed",
			record: {
				requestHash,
				responseBody: '{"bookingId":"B-1"}',
				responseStatus: 201,
			},
		});

		const overwrite = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.complete(
					tenantId,
					key,
					requestHash,
					'{"bookingId":"B-2"}',
					200,
					reservation.reservationCreatedAt,
				);
			}),
		);
		expect(overwrite).toBe(false);
	});

	it("releases only the matching pending reservation", async () => {
		const reservation = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.reserve(tenantId, key, requestHash);
			}),
		);
		if (reservation._tag !== "Acquired") {
			throw new Error("Expected to acquire the reservation.");
		}

		const mismatchedRelease = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.release(
					tenantId,
					key,
					"b".repeat(64),
					reservation.reservationCreatedAt,
				);
			}),
		);
		expect(mismatchedRelease).toBe(false);

		const released = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.release(
					tenantId,
					key,
					requestHash,
					reservation.reservationCreatedAt,
				);
			}),
		);
		expect(released).toBe(true);

		const reacquired = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.reserve(tenantId, key, requestHash);
			}),
		);
		expect(reacquired._tag).toBe("Acquired");
	});

	it("atomically reclaims an old matching pending reservation", async () => {
		const staleCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
		await runDb(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				yield* Effect.promise(() =>
					db.insert(idempotencyKeys).values({
						businessId: tenantId,
						idempotencyKey: key,
						requestHash,
						responseBody: "null",
						responseStatus: 0,
						createdAt: staleCreatedAt,
					}),
				);
			}),
		);

		const recovered = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.reserve(tenantId, key, requestHash);
			}),
		);
		expect(recovered._tag).toBe("Acquired");

		const staleOwnerCompletion = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.complete(
					tenantId,
					key,
					requestHash,
					'{"bookingId":"stale"}',
					200,
					staleCreatedAt,
				);
			}),
		);
		expect(staleOwnerCompletion).toBe(false);
	});

	it("does not reclaim an old pending reservation for a different payload", async () => {
		const staleCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
		await runDb(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				yield* Effect.promise(() =>
					db.insert(idempotencyKeys).values({
						businessId: tenantId,
						idempotencyKey: key,
						requestHash,
						responseBody: "null",
						responseStatus: 0,
						createdAt: staleCreatedAt,
					}),
				);
			}),
		);

		const conflict = await runIdempotency(
			Effect.gen(function* () {
				const idempotency = yield* IIdempotency;
				return yield* idempotency.reserve(tenantId, key, "b".repeat(64));
			}),
		);
		expect(conflict).toEqual({ _tag: "InProgress", requestHash });
	});
});
