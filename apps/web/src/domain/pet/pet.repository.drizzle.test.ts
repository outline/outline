// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import type { TCustomerId } from "@/domain/customer/customer.types";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { type IPetRepository, PetRepository } from "./pet.repository";
import { PetRepositoryDrizzle } from "./pet.repository.drizzle";

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
const petRepoLayer = Layer.provide(PetRepositoryDrizzle, DrizzleClientLive);
const run = <A, E>(effect: Effect.Effect<A, E, IPetRepository>) =>
	Effect.runPromise(Effect.provide(effect, petRepoLayer));

describe.skipIf(!hasDb)("pet repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const customerId = generateId<TCustomerId>();
	const prefix = `__smoke_pet_${Date.now()}`;

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(sql`DELETE FROM pets WHERE name LIKE ${`${prefix}%`}`);
		await db.execute(sql`DELETE FROM customers WHERE id = ${customerId}`);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
	});

	it("creates and reads a pet", async () => {
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, 'Test Business', ${generateId()})`,
		);
		await db.execute(
			sql`INSERT INTO customers (id, business_id, full_name, phone) VALUES (${customerId}, ${tenantId}, 'Test Customer', '08123456789')`,
		);

		const saved = await run(
			Effect.gen(function* () {
				const repo = yield* PetRepository;
				return yield* repo.save({
					tenantId,
					customerId,
					name: `${prefix} Fluffy`,
					species: "dog",
					breed: "Golden Retriever",
					gender: "male",
					birthDate: new Date("2020-01-01"),
					weightKg: 25.5,
					color: "Golden",
					isVaccinated: true,
					vaccineNotes: "All good",
					allergies: "None",
					medicalNotes: "Healthy",
					specialInstructions: "Loves belly rubs",
					photoUrl: null,
					isActive: true,
				});
			}),
		);

		expect(saved.id).toBeDefined();
		expect(saved.name).toBe(`${prefix} Fluffy`);
		expect(saved.species).toBe("dog");
		expect(saved.weightKg).toBe(25.5);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* PetRepository;
				return yield* repo.findById(saved.id, tenantId);
			}),
		);
		expect(found.name).toBe(`${prefix} Fluffy`);
		expect(found.customerId).toBe(customerId);
	}, 15000);

	it("finds pets by customer id", async () => {
		const results = await run(
			Effect.gen(function* () {
				const repo = yield* PetRepository;
				return yield* repo.findByCustomerId(customerId, tenantId);
			}),
		);
		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results[0]?.name).toBe(`${prefix} Fluffy`);
	});

	it("finds all active pets", async () => {
		const results = await run(
			Effect.gen(function* () {
				const repo = yield* PetRepository;
				return yield* repo.findAllActive(tenantId);
			}),
		);
		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results.some((p) => p.name === `${prefix} Fluffy`)).toBe(true);
	});

	it("updates a pet", async () => {
		const pets = await run(
			Effect.gen(function* () {
				const repo = yield* PetRepository;
				return yield* repo.findByCustomerId(customerId, tenantId);
			}),
		);
		const pet = pets[0];
		expect(pet).toBeDefined();

		if (pet) {
			const updated = await run(
				Effect.gen(function* () {
					const repo = yield* PetRepository;
					return yield* repo.update(pet.id, tenantId, {
						name: `${prefix} Fluffy Updated`,
						weightKg: 26.0,
					});
				}),
			);
			expect(updated.name).toBe(`${prefix} Fluffy Updated`);
			expect(updated.weightKg).toBe(26.0);
			expect(updated.species).toBe("dog"); // Unchanged
		}
	});

	it("deletes a pet", async () => {
		const pets = await run(
			Effect.gen(function* () {
				const repo = yield* PetRepository;
				return yield* repo.findByCustomerId(customerId, tenantId);
			}),
		);
		const pet = pets[0];
		expect(pet).toBeDefined();

		if (pet) {
			await run(
				Effect.gen(function* () {
					const repo = yield* PetRepository;
					yield* repo.delete(pet.id, tenantId);
				}),
			);

			const afterDelete = await run(
				Effect.gen(function* () {
					const repo = yield* PetRepository;
					return yield* repo.findById(pet.id, tenantId);
				}),
			).catch((e: unknown) => e as Error);

			expect(afterDelete.toString()).toContain("PetNotFoundError");
		}
	});
});
