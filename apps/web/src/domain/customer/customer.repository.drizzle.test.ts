// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { ICustomerRepository } from "./customer.repository";
import { CustomerRepositoryDrizzle } from "./customer.repository.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = () =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);
const customerRepoLayer = Layer.provide(
	CustomerRepositoryDrizzle,
	DrizzleClientLive,
);
const run = <A, E>(effect: Effect.Effect<A, E, ICustomerRepository>) =>
	Effect.runPromise(Effect.provide(effect, customerRepoLayer));

describe.skipIf(!hasDb)("customer repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const prefix = `__smoke_cust_${Date.now()}`;

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM customers WHERE full_name LIKE ${`${prefix}%`}`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
	});

	it("creates and reads a customer", async () => {
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, 'Test Business', ${generateId()})`,
		);

		await run(
			Effect.gen(function* () {
				const repo = yield* ICustomerRepository;
				yield* repo.create(tenantId, {
					fullName: `${prefix} John Doe`,
					phone: "08123456789",
				});
			}),
		);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* ICustomerRepository;
				return yield* repo.findByPhone(tenantId, "08123456789");
			}),
		);
		expect(found?.fullName).toBe(`${prefix} John Doe`);
	}, 15000);

	it("searches customers by name", async () => {
		const results = await run(
			Effect.gen(function* () {
				const repo = yield* ICustomerRepository;
				return yield* repo.findAll(tenantId, "John");
			}),
		);
		expect(results.length).toBeGreaterThanOrEqual(1);
	});

	it("finds customers by phone number", async () => {
		const found = await run(
			Effect.gen(function* () {
				const repo = yield* ICustomerRepository;
				return yield* repo.findByPhone(tenantId, "08123456789");
			}),
		);
		expect(found).not.toBeNull();
	});

	it("updates a customer", async () => {
		const found = await run(
			Effect.gen(function* () {
				const repo = yield* ICustomerRepository;
				return yield* repo.findByPhone(tenantId, "08123456789");
			}),
		);
		expect(found).not.toBeNull();

		if (found) {
			const updated = await run(
				Effect.gen(function* () {
					const repo = yield* ICustomerRepository;
					return yield* repo.update(tenantId, {
						id: found.id,
						fullName: `${prefix} Jane Doe`,
					});
				}),
			);
			expect(updated.fullName).toBe(`${prefix} Jane Doe`);
		}
	});

	it("deletes a customer", async () => {
		const found = await run(
			Effect.gen(function* () {
				const repo = yield* ICustomerRepository;
				return yield* repo.findByPhone(tenantId, "08123456789");
			}),
		);
		expect(found).not.toBeNull();

		if (found) {
			await run(
				Effect.gen(function* () {
					const repo = yield* ICustomerRepository;
					yield* repo.delete(tenantId, found.id);
				}),
			);

			const afterDelete = await run(
				Effect.gen(function* () {
					const repo = yield* ICustomerRepository;
					return yield* repo.findById(tenantId, found.id);
				}),
			);
			expect(afterDelete).toBeNull();
		}
	});
});
