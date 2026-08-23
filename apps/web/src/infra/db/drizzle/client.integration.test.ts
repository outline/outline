// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Exit, Layer, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "./client";
import { businesses } from "./schema";

// Integration test: hanya jalan bila DATABASE_URL (Neon) tersedia.
const hasDb = Boolean(process.env.DATABASE_URL);

// `DrizzleClientLive` is now `Layer.scoped`: its pool closes when the scope
// it was built against closes. `Effect.provide(effect, DrizzleClientLive)`
// ties that scope to `effect`'s own lifetime, so `Effect.provide(IDrizzleClient,
// DrizzleClientLive)` (an effect that finishes the instant the tag is
// resolved) would open and close the pool before this promise even
// resolves. The tests below get a client and keep using it well after
// `getClient()` returns, so every client here is built against one shared,
// long-lived scope via `Scope.extend` instead, and that shared scope is
// closed explicitly in `afterAll` once every test is done with it.
const clientScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getClient = () =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			clientScope!,
		),
	);

describe.skipIf(!hasDb)("drizzle neon client (integration)", () => {
	const testName = `__smoke_test_${Date.now()}`;

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getClient();
		await db.execute(
			sql`DELETE FROM businesses WHERE name LIKE '__smoke_test_%'`,
		);
		await Effect.runPromise(Scope.close(clientScope!, Exit.void));
	});

	// Timeout raised from vitest's 5s default: Neon's serverless compute can
	// cold-start on the first connection after being idle.
	it("commits an insert inside a transaction", async () => {
		const db = await getClient();

		await db.transaction(async (tx) => {
			// `ownerId` is NOT NULL with no default in the businesses table
			// (see schema.ts) — the brief's original snippet only set `name`,
			// which would fail the NOT NULL constraint. A random UUID is a
			// plausible owner id for this smoke test.
			await tx
				.insert(businesses)
				.values({ name: testName, ownerId: crypto.randomUUID() });
		});

		const rows = await db
			.select()
			.from(businesses)
			.where(sql`${businesses.name} = ${testName}`);
		expect(rows).toHaveLength(1);
	}, 15000);

	it("rolls back when the transaction throws", async () => {
		const db = await getClient();
		const rollbackName = `${testName}_rollback`;

		await expect(
			db.transaction(async (tx) => {
				await tx
					.insert(businesses)
					.values({ name: rollbackName, ownerId: crypto.randomUUID() });
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		const rows = await db
			.select()
			.from(businesses)
			.where(sql`${businesses.name} = ${rollbackName}`);
		expect(rows).toHaveLength(0);
	}, 15000);

	it("closes the underlying pool once the provided effect completes", async () => {
		let capturedDb: Awaited<ReturnType<typeof getClient>> | undefined;

		await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const db = yield* IDrizzleClient;
					capturedDb = db;
					yield* Effect.promise(() => db.select().from(businesses).limit(1));
				}),
				DrizzleClientLive,
			),
		);

		await expect(
			capturedDb!.select().from(businesses).limit(1),
		).rejects.toThrow();
	}, 15000);
});
