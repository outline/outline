// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TOrderItemId } from "@/domain/order/order.types";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IReturnRepository } from "./return.repository";
import { ReturnRepositoryDrizzle } from "./return.repository.drizzle";
import type { TReturnId, TReturnItemId } from "./return.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const returnRepoLayer = Layer.provide(
	ReturnRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, IReturnRepository>) =>
	Effect.runPromise(Effect.provide(effect, returnRepoLayer));

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

describe.skipIf(!hasDb)("return repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const otherTenantId = generateId<TTenantId>();
	const userId = generateId<TUserId>();
	const prefix = `__smoke_ret_${Date.now()}`;
	let branchId: string;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();

		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${userId})`,
		);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${otherTenantId}, ${`${prefix} Other Business`}, ${userId})`,
		);

		branchId = generateId();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name) VALUES (${branchId}, ${tenantId}, ${`${prefix} Branch`})`,
		);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE business_id IN (${tenantId}, ${otherTenantId}))`,
		);
		await db.execute(
			sql`DELETE FROM returns WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id IN (${tenantId}, ${otherTenantId}))`,
		);
		await db.execute(
			sql`DELETE FROM orders WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM product_variants WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM products WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM branches WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM businesses WHERE id IN (${tenantId}, ${otherTenantId})`,
		);
	});

	const setupOrderWithItem = async (
		businessId: string,
		stock: number,
	): Promise<{ orderId: string; orderItemId: string; variantId: string }> => {
		const db = await getDb();
		const productId = generateId();
		const variantId = generateId();
		const orderId = generateId();
		const orderItemId = generateId();

		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock, price, category) VALUES (${productId}, ${businessId}, ${`${prefix} Product ${orderId}`}, 100, 50000, ${`${prefix} Cat`})`,
		);
		await db.execute(
			sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${businessId}, 'Default', 50000, ${stock})`,
		);
		await db.execute(
			sql`INSERT INTO orders (id, business_id, branch_id, total_amount, created_by) VALUES (${orderId}, ${businessId}, ${branchId}, 100000, ${userId})`,
		);
		await db.execute(
			sql`INSERT INTO order_items (id, order_id, product_id, quantity, price_at_time, variant_id) VALUES (${orderItemId}, ${orderId}, ${productId}, 2, 50000, ${variantId})`,
		);

		return { orderId, orderItemId, variantId };
	};

	it("returns only returns for the requested tenant", async () => {
		const db = await getDb();

		const orderMine = await setupOrderWithItem(tenantId, 0);
		const orderOther = await setupOrderWithItem(otherTenantId, 0);

		await db.execute(
			sql`INSERT INTO returns (id, business_id, order_id, status, refund_amount, created_by) VALUES (${generateId()}, ${tenantId}, ${orderMine.orderId}, 'completed', 50000, ${userId})`,
		);
		await db.execute(
			sql`INSERT INTO returns (id, business_id, order_id, status, refund_amount, created_by) VALUES (${generateId()}, ${otherTenantId}, ${orderOther.orderId}, 'completed', 50000, ${userId})`,
		);

		const results = await run(
			Effect.gen(function* () {
				const repo = yield* IReturnRepository;
				return yield* repo.findAll(tenantId);
			}),
		);

		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results.every((r) => r.tenantId === tenantId)).toBe(true);
	}, 20000);

	it("processes a return, creates return_items, and restores stock for non-damaged items", async () => {
		const { orderId, orderItemId, variantId } = await setupOrderWithItem(
			tenantId,
			10,
		);

		const db = await getDb();
		const beforeStock = await db.execute(
			sql`SELECT stock FROM product_variants WHERE id = ${variantId}`,
		);
		expect(Number(beforeStock.rows[0]?.stock)).toBe(10);

		const returnId = generateId<TReturnId>();
		const itemId = generateId<TReturnItemId>();

		const resultReturnId = await run(
			Effect.gen(function* () {
				const repo = yield* IReturnRepository;
				return yield* repo.processReturn({
					id: returnId,
					tenantId,
					orderId: orderId as never,
					status: "completed",
					refundMethod: "cash",
					refundAmount: 25000,
					reason: "Defective",
					createdBy: userId,
					createdAt: new Date(),
					updatedAt: new Date(),
					items: [
						{
							id: itemId,
							returnId,
							orderItemId: orderItemId as TOrderItemId,
							qty: 2,
							reason: "Defective",
							isDamaged: false,
						},
					],
				});
			}),
		);

		expect(resultReturnId).toBe(returnId);

		const returnRows = await db.execute(
			sql`SELECT * FROM returns WHERE id = ${returnId}`,
		);
		expect(returnRows.rows.length).toBe(1);
		expect(returnRows.rows[0]?.business_id).toBe(tenantId);
		expect(returnRows.rows[0]?.status).toBe("completed");
		expect(Number(returnRows.rows[0]?.refund_amount)).toBe(25000);

		const itemRows = await db.execute(
			sql`SELECT * FROM return_items WHERE return_id = ${returnId}`,
		);
		expect(itemRows.rows.length).toBe(1);
		expect(itemRows.rows[0]?.order_item_id).toBe(orderItemId);
		expect(Number(itemRows.rows[0]?.qty)).toBe(2);
		expect(itemRows.rows[0]?.is_damaged).toBe(false);

		const afterStock = await db.execute(
			sql`SELECT stock FROM product_variants WHERE id = ${variantId}`,
		);
		expect(Number(afterStock.rows[0]?.stock)).toBe(12);
	}, 20000);

	it("does not restore stock for damaged items", async () => {
		const { orderId, orderItemId, variantId } = await setupOrderWithItem(
			tenantId,
			20,
		);

		const db = await getDb();

		const returnId = generateId<TReturnId>();
		const itemId = generateId<TReturnItemId>();

		await run(
			Effect.gen(function* () {
				const repo = yield* IReturnRepository;
				return yield* repo.processReturn({
					id: returnId,
					tenantId,
					orderId: orderId as never,
					status: "completed",
					refundMethod: null,
					refundAmount: 0,
					reason: "Damaged",
					createdBy: userId,
					createdAt: new Date(),
					updatedAt: new Date(),
					items: [
						{
							id: itemId,
							returnId,
							orderItemId: orderItemId as TOrderItemId,
							qty: 3,
							reason: "Damaged in transit",
							isDamaged: true,
						},
					],
				});
			}),
		);

		const afterStock = await db.execute(
			sql`SELECT stock FROM product_variants WHERE id = ${variantId}`,
		);
		expect(Number(afterStock.rows[0]?.stock)).toBe(20);
	}, 20000);

	it("skips stock restore when order_item has no variant_id", async () => {
		const db = await getDb();
		const productId = generateId();
		const orderId = generateId();
		const orderItemId = generateId();

		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock, price, category) VALUES (${productId}, ${tenantId}, ${`${prefix} No Variant ${orderId}`}, 100, 50000, ${`${prefix} Cat`})`,
		);
		await db.execute(
			sql`INSERT INTO orders (id, business_id, branch_id, total_amount, created_by) VALUES (${orderId}, ${tenantId}, ${branchId}, 50000, ${userId})`,
		);
		await db.execute(
			sql`INSERT INTO order_items (id, order_id, product_id, quantity, price_at_time, variant_id) VALUES (${orderItemId}, ${orderId}, ${productId}, 1, 50000, NULL)`,
		);

		const returnId = generateId<TReturnId>();
		const itemId = generateId<TReturnItemId>();

		const resultReturnId = await run(
			Effect.gen(function* () {
				const repo = yield* IReturnRepository;
				return yield* repo.processReturn({
					id: returnId,
					tenantId,
					orderId: orderId as never,
					status: "completed",
					refundMethod: null,
					refundAmount: 0,
					reason: null,
					createdBy: userId,
					createdAt: new Date(),
					updatedAt: new Date(),
					items: [
						{
							id: itemId,
							returnId,
							orderItemId: orderItemId as TOrderItemId,
							qty: 1,
							reason: null,
							isDamaged: false,
						},
					],
				});
			}),
		);

		expect(resultReturnId).toBe(returnId);

		const returnRows = await db.execute(
			sql`SELECT * FROM returns WHERE id = ${returnId}`,
		);
		expect(returnRows.rows.length).toBe(1);
	}, 20000);
});
