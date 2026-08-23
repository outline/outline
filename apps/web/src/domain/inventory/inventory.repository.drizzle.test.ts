import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { IInventoryRepository } from "./inventory.repository";
import { InventoryRepository } from "./inventory.repository";
import { InventoryRepositoryDrizzle } from "./inventory.repository.drizzle";

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

const inventoryRepoLayer = Layer.provide(
	InventoryRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, IInventoryRepository>) =>
	Effect.runPromise(Effect.provide(effect, inventoryRepoLayer));

describe.skipIf(!hasDb)("inventory repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const prefix = `__smoke_inv_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${generateId()}) ON CONFLICT (id) DO NOTHING`,
		);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM product_batches WHERE notes LIKE ${`${prefix}%`}`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
	});

	it("adds a batch and updates variant stock", async () => {
		const variantId = generateId();
		const productId = generateId();
		const batchId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock) VALUES (${productId}, ${tenantId}, ${`${prefix} Product`}, 0)`,
		);
		await db.execute(
			sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${tenantId}, 'Default', 1000, 0)`,
		);

		const result1 = await run(
			InventoryRepository.pipe(
				Effect.flatMap((repo) =>
					repo.addBatch(
						{
							batchId,
							variantId,
							batchNumber: null,
							quantity: 100,
							costPrice: 500,
							expiryDate: null,
							supplierId: null,
							poId: null,
							notes: `${prefix} Initial Stock`,
						},
						tenantId,
					),
				),
			),
		);
		expect(result1.batchId).toBe(batchId);

		const result1a = await db.execute(
			sql`SELECT stock FROM product_variants WHERE id = ${variantId}`,
		);
		expect(Number(result1a.rows[0]?.stock)).toBe(100);
	}, 15000);

	it("deducts stock and writes a movement", async () => {
		const variantId = generateId();
		const productId = generateId();
		const batchId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock) VALUES (${productId}, ${tenantId}, ${`${prefix} Product2`}, 0)`,
		);
		await db.execute(
			sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${tenantId}, 'Default', 1000, 50)`,
		);
		await db.execute(
			sql`INSERT INTO product_batches (id, business_id, variant_id, quantity, initial_qty, cost_price) VALUES (${batchId}, ${tenantId}, ${variantId}, 50, 50, 500)`,
		);

		await run(
			InventoryRepository.pipe(
				Effect.flatMap((repo) =>
					repo.deductStock(
						{
							variantId,
							totalQuantity: 10,
							referenceType: "manual",
							referenceId: "",
							notes: "Test deduction",
							deductions: [{ batchId, deductQty: 10 }],
						},
						tenantId,
					),
				),
			),
		);

		const result2 = await db.execute(
			sql`SELECT stock FROM product_variants WHERE id = ${variantId}`,
		);
		expect(Number(result2.rows[0]?.stock)).toBe(40);
	}, 15000);

	it("finds batches by variant", async () => {
		const variantId = generateId();
		const productId = generateId();
		const batchId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock) VALUES (${productId}, ${tenantId}, ${`${prefix} Product3`}, 0)`,
		);
		await db.execute(
			sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${tenantId}, 'Default', 1000, 100)`,
		);
		await db.execute(
			sql`INSERT INTO product_batches (id, business_id, variant_id, quantity, initial_qty, cost_price, notes) VALUES (${batchId}, ${tenantId}, ${variantId}, 100, 100, 500, ${`${prefix} findBatchesByVariant`})`,
		);

		const batches = await run(
			InventoryRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findBatchesByVariant(
						variantId as import("@/domain/product/product.types").TProductVariantId,
						tenantId,
					),
				),
			),
		);

		expect(batches.length).toBeGreaterThanOrEqual(1);
		expect(batches[0]?.notes).toBe(`${prefix} findBatchesByVariant`);
	}, 15000);

	it("finds expiring batches", async () => {
		const variantId = generateId();
		const productId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock) VALUES (${productId}, ${tenantId}, ${`${prefix} Product4`}, 0)`,
		);
		await db.execute(
			sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${tenantId}, 'Default', 1000, 50)`,
		);
		await db.execute(
			sql`INSERT INTO product_batches (id, business_id, variant_id, quantity, initial_qty, cost_price, expiry_date, notes) VALUES (${generateId()}, ${tenantId}, ${variantId}, 10, 10, 500, CURRENT_DATE + INTERVAL '2 days', ${`${prefix} expiring`})`,
		);
		await db.execute(
			sql`INSERT INTO product_batches (id, business_id, variant_id, quantity, initial_qty, cost_price, expiry_date, notes) VALUES (${generateId()}, ${tenantId}, ${variantId}, 10, 10, 500, CURRENT_DATE + INTERVAL '90 days', ${`${prefix} not-expiring`})`,
		);

		const expiringBatches = await run(
			InventoryRepository.pipe(
				Effect.flatMap((repo) => repo.findExpiringBatches(tenantId, 7)),
			),
		);

		expect(expiringBatches.length).toBeGreaterThanOrEqual(1);
		expect(expiringBatches.some((b) => b.notes === `${prefix} expiring`)).toBe(
			true,
		);
	}, 15000);

	it("finds movements by variant", async () => {
		const variantId = generateId();
		const productId = generateId();
		const batchId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock) VALUES (${productId}, ${tenantId}, ${`${prefix} Product5`}, 0)`,
		);
		await db.execute(
			sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${tenantId}, 'Default', 1000, 0)`,
		);

		// Add batch via repo to create movement
		await run(
			InventoryRepository.pipe(
				Effect.flatMap((repo) =>
					repo.addBatch(
						{
							batchId,
							variantId,
							batchNumber: null,
							quantity: 50,
							costPrice: 500,
							expiryDate: null,
							supplierId: null,
							poId: null,
							notes: `${prefix} movements test`,
						},
						tenantId,
					),
				),
			),
		);

		const movements = await run(
			InventoryRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findMovementsByVariant(
						variantId as import("@/domain/product/product.types").TProductVariantId,
						tenantId,
					),
				),
			),
		);

		expect(movements.length).toBeGreaterThanOrEqual(1);
		expect(movements[0]?.type).toBe("in");
		expect(Number(movements[0]?.quantity)).toBe(50);
	}, 15000);
});
