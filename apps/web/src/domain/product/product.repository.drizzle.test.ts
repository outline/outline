// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branches,
	businesses,
	orderItems,
	orders,
} from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IProductRepository } from "./product.repository";
import { ProductRepositoryDrizzle } from "./product.repository.drizzle";
import type {
	TProductId,
	TProductVariantId,
	TProductWithVariants,
} from "./product.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const productRepoLayer = Layer.provide(
	ProductRepositoryDrizzle,
	DrizzleClientLive,
);
const run = <A, E>(effect: Effect.Effect<A, E, IProductRepository>) =>
	Effect.runPromise(Effect.provide(effect, productRepoLayer));

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

describe.skipIf(!hasDb)("product repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const prefix = `__smoke_prod_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.insert(businesses).values({
			id: tenantId,
			name: `${prefix} Test Business`,
			ownerId: "00000000-0000-0000-0000-000000000000",
		});
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// order_items.product_id -> products.id is ON DELETE RESTRICT (not
		// cascade), so any order_items seeded against this tenant's products
		// (e.g. by the sort=popular test) must be removed before the products
		// DELETE below, or that DELETE fails with a foreign key violation.
		await db.execute(
			sql`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id = ${tenantId})`,
		);
		await db.delete(orders).where(eq(orders.businessId, tenantId));
		await db.execute(sql`DELETE FROM products WHERE name LIKE ${`${prefix}%`}`);
		await db.delete(businesses).where(eq(businesses.id, tenantId));
	});

	const makeProduct = (id: TProductId, name: string): TProductWithVariants => ({
		id,
		tenantId,
		name,
		category: null,
		description: null,
		brand: null,
		imageUrl: null,
		hasVariants: true,
		isActive: true,
		isFeatured: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		variants: [],
	});

	const makeVariant = (
		id: TProductVariantId,
		productId: TProductId,
		name: string,
		price: number,
		stock: number,
	) => ({
		id,
		productId,
		tenantId,
		name,
		sku: null,
		barcode: null,
		price,
		costPrice: 0,
		unit: "pcs" as const,
		isFractional: false,
		stock,
		lowStockThreshold: 5,
		isActive: true,
		sortOrder: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	it("creates and reads back a product with variants", async () => {
		const productId = generateId<TProductId>();
		const variantId = generateId<TProductVariantId>();
		const productName = `${prefix} Test Product`;

		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(productId, productName),
						variants: [makeVariant(variantId, productId, "Default", 10000, 50)],
					},
					{ isNew: true },
				);
			}),
		);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findById(productId, tenantId);
			}),
		);
		expect(found).not.toBeNull();
		expect(found?.name).toBe(productName);
	}, 15000);

	it("replaces variants on isNew=false (soft-deletes missing ones)", async () => {
		const productId = generateId<TProductId>();
		const variant1Id = generateId<TProductVariantId>();
		const productName = `${prefix} Replace Test`;

		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(productId, productName),
						variants: [makeVariant(variant1Id, productId, "V1", 5000, 10)],
					},
					{ isNew: true },
				);
			}),
		);

		const variant2Id = generateId<TProductVariantId>();
		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(productId, productName),
						variants: [makeVariant(variant2Id, productId, "V2", 7000, 5)],
					},
					{ isNew: false },
				);
			}),
		);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findVariantsByProductId(productId, tenantId);
			}),
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.name).toBe("V2");
	}, 15000);

	it("finds all active products with variants", async () => {
		const productId = generateId<TProductId>();
		const variantId = generateId<TProductVariantId>();
		const productName = `${prefix} FindAll Active`;

		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(productId, productName),
						variants: [makeVariant(variantId, productId, "Default", 5000, 20)],
					},
					{ isNew: true },
				);
			}),
		);

		const results = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findAllActive(tenantId);
			}),
		);
		expect(results.length).toBeGreaterThan(0);
		const match = results.find((p) => p.id === productId);
		expect(match).toBeDefined();
		expect(match?.name).toBe(productName);
		expect(match?.variants.length).toBeGreaterThan(0);
	}, 15000);

	it("findPage: paginates, computes a real total, and applies category filter", async () => {
		const ids = [
			generateId<TProductId>(),
			generateId<TProductId>(),
			generateId<TProductId>(),
		];
		const names = [`${prefix} Page A`, `${prefix} Page B`, `${prefix} Page C`];

		for (let i = 0; i < ids.length; i++) {
			await run(
				Effect.gen(function* () {
					const repo = yield* IProductRepository;
					yield* repo.saveFull(
						{
							...makeProduct(ids[i] as TProductId, names[i] as string),
							category: "aquascape",
							variants: [
								makeVariant(
									generateId<TProductVariantId>(),
									ids[i] as TProductId,
									"Default",
									10000,
									5,
								),
							],
						},
						{ isNew: true },
					);
				}),
			);
		}

		const firstPage = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findPage(tenantId, {
					category: "aquascape",
					limit: 2,
					offset: 0,
				});
			}),
		);
		expect(firstPage.total).toBe(3);
		expect(firstPage.items).toHaveLength(2);

		const secondPage = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findPage(tenantId, {
					category: "aquascape",
					limit: 2,
					offset: 2,
				});
			}),
		);
		expect(secondPage.total).toBe(3);
		expect(secondPage.items).toHaveLength(1);

		const noMatch = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findPage(tenantId, {
					category: "does-not-exist",
				});
			}),
		);
		expect(noMatch.total).toBe(0);
		expect(noMatch.items).toHaveLength(0);
	}, 15000);

	it("findPage: filters by price range across variant prices", async () => {
		const cheapId = generateId<TProductId>();
		const expensiveId = generateId<TProductId>();

		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(cheapId, `${prefix} Cheap`),
						variants: [
							makeVariant(
								generateId<TProductVariantId>(),
								cheapId,
								"Default",
								5000,
								10,
							),
						],
					},
					{ isNew: true },
				);
				yield* repo.saveFull(
					{
						...makeProduct(expensiveId, `${prefix} Expensive`),
						variants: [
							makeVariant(
								generateId<TProductVariantId>(),
								expensiveId,
								"Default",
								500000,
								10,
							),
						],
					},
					{ isNew: true },
				);
			}),
		);

		const result = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findPage(tenantId, {
					minPrice: 1000,
					maxPrice: 10000,
				});
			}),
		);

		const resultIds = result.items.map((p) => p.id);
		expect(resultIds).toContain(cheapId);
		expect(resultIds).not.toContain(expensiveId);
	}, 15000);

	it("findPage: search matches product name and variant SKU", async () => {
		const nameMatchId = generateId<TProductId>();
		const skuMatchId = generateId<TProductId>();
		const noMatchId = generateId<TProductId>();
		const uniqueToken = `${prefix}zzqx`;

		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(nameMatchId, `${uniqueToken} Betta Fish`),
						variants: [
							makeVariant(
								generateId<TProductVariantId>(),
								nameMatchId,
								"Default",
								10000,
								5,
							),
						],
					},
					{ isNew: true },
				);
				yield* repo.saveFull(
					{
						...makeProduct(skuMatchId, `${prefix} Some Other Name`),
						variants: [
							{
								...makeVariant(
									generateId<TProductVariantId>(),
									skuMatchId,
									"Default",
									10000,
									5,
								),
								sku: uniqueToken,
							},
						],
					},
					{ isNew: true },
				);
				yield* repo.saveFull(
					{
						...makeProduct(noMatchId, `${prefix} Unrelated`),
						variants: [
							makeVariant(
								generateId<TProductVariantId>(),
								noMatchId,
								"Default",
								10000,
								5,
							),
						],
					},
					{ isNew: true },
				);
			}),
		);

		const result = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findPage(tenantId, { search: uniqueToken });
			}),
		);

		const resultIds = result.items.map((p) => p.id);
		expect(resultIds).toContain(nameMatchId);
		expect(resultIds).toContain(skuMatchId);
		expect(resultIds).not.toContain(noMatchId);
	}, 15000);

	it("findPage: sort=popular orders by total quantity sold, unsold products last", async () => {
		const bestSellerId = generateId<TProductId>();
		const neverOrderedId = generateId<TProductId>();
		const bestSellerVariantId = generateId<TProductVariantId>();

		await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				yield* repo.saveFull(
					{
						...makeProduct(bestSellerId, `${prefix} Best Seller`),
						variants: [
							makeVariant(
								bestSellerVariantId,
								bestSellerId,
								"Default",
								10000,
								50,
							),
						],
					},
					{ isNew: true },
				);
				yield* repo.saveFull(
					{
						...makeProduct(neverOrderedId, `${prefix} Never Ordered`),
						variants: [
							makeVariant(
								generateId<TProductVariantId>(),
								neverOrderedId,
								"Default",
								10000,
								50,
							),
						],
					},
					{ isNew: true },
				);
			}),
		);

		const db = await getDb();
		const branchId = generateId<string>();
		await db.insert(branches).values({
			id: branchId,
			businessId: tenantId,
			name: `${prefix} Test Branch`,
		});
		const orderId = generateId<string>();
		await db.insert(orders).values({
			id: orderId,
			businessId: tenantId,
			branchId,
			createdBy: "00000000-0000-0000-0000-000000000000",
			totalAmount: "70000",
		});
		await db.insert(orderItems).values({
			id: generateId<string>(),
			orderId,
			productId: bestSellerId,
			variantId: bestSellerVariantId,
			quantity: "7",
			priceAtTime: "10000",
		});

		const result = await run(
			Effect.gen(function* () {
				const repo = yield* IProductRepository;
				return yield* repo.findPage(tenantId, { sort: "popular" });
			}),
		);

		const bestSellerIndex = result.items.findIndex(
			(p) => p.id === bestSellerId,
		);
		const neverOrderedIndex = result.items.findIndex(
			(p) => p.id === neverOrderedId,
		);
		expect(bestSellerIndex).toBeGreaterThanOrEqual(0);
		expect(neverOrderedIndex).toBeGreaterThanOrEqual(0);
		expect(bestSellerIndex).toBeLessThan(neverOrderedIndex);
	}, 15000);
});
