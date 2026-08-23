// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { businesses } from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { ISupplierRepository } from "./supplier.repository";
import { SupplierRepositoryDrizzle } from "./supplier.repository.drizzle";
import type { TSupplier, TSupplierId } from "./supplier.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const supplierRepoLayer = Layer.provide(
	SupplierRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(
	effect: Effect.Effect<A, E, ISupplierRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, supplierRepoLayer));

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

const makeSupplier = (tenantId: TTenantId, name: string): TSupplier => {
	const now = new Date();
	return {
		id: generateId<TSupplierId>(),
		tenantId,
		name,
		contactPerson: "Contact Person",
		phone: "08123456789",
		email: "supplier@example.com",
		address: "Jl. Test No. 1",
		notes: null,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	};
};

describe.skipIf(!hasDb)("supplier repository drizzle (integration)", () => {
	const businessId = generateId<TTenantId>();
	const prefix = `__smoke_supp_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.insert(businesses).values({
			id: businessId,
			name: `${prefix} Test Business`,
			ownerId: "00000000-0000-0000-0000-000000000000",
		});
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM suppliers WHERE name LIKE ${`${prefix}%`}`,
		);
		await db.delete(businesses).where(eq(businesses.id, businessId));
	});

	it("saves a new supplier and reads it back by id", async () => {
		const supplier = makeSupplier(businessId, `${prefix} Acme Corp`);

		await run(
			Effect.gen(function* () {
				const repo = yield* ISupplierRepository;
				yield* repo.save(supplier);
			}),
		);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* ISupplierRepository;
				return yield* repo.findById(supplier.id, businessId);
			}),
		);

		expect(found).not.toBeNull();
		expect(found?.name).toBe(`${prefix} Acme Corp`);
		expect(found?.tenantId).toBe(businessId);
		expect(found?.contactPerson).toBe("Contact Person");
		expect(found?.isActive).toBe(true);
	}, 15000);

	it("returns null when supplier id is not found", async () => {
		const missing = await run(
			Effect.gen(function* () {
				const repo = yield* ISupplierRepository;
				return yield* repo.findById(generateId<TSupplierId>(), businessId);
			}),
		);
		expect(missing).toBeNull();
	}, 15000);

	it("findAll returns tenant suppliers sorted by name", async () => {
		const a = makeSupplier(businessId, `${prefix} Alpha Supplies`);
		const b = makeSupplier(businessId, `${prefix} Beta Goods`);

		await run(
			Effect.gen(function* () {
				const repo = yield* ISupplierRepository;
				yield* repo.save(a);
				yield* repo.save(b);
			}),
		);

		const all = await run(
			Effect.gen(function* () {
				const repo = yield* ISupplierRepository;
				return yield* repo.findAll(businessId);
			}),
		);

		const mine = all.filter((s) => s.name.startsWith(prefix));
		const mineNames = mine.map((s) => s.name);
		expect(mineNames).toContain(`${prefix} Alpha Supplies`);
		expect(mineNames).toContain(`${prefix} Beta Goods`);
		const sortedMine = [...mineNames].sort();
		expect(mineNames).toEqual(sortedMine);
		expect(all.every((s) => s.tenantId === businessId)).toBe(true);
	}, 15000);
});
