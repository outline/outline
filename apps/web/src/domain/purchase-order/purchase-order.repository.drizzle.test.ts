import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { IPurchaseOrderRepository } from "./purchase-order.repository";
import { IPurchaseOrderRepository as IPurchaseOrderRepositoryTag } from "./purchase-order.repository";
import { PurchaseOrderRepositoryDrizzle } from "./purchase-order.repository.drizzle";
import type {
	TPoItemId,
	TPurchaseOrderId,
	TPurchaseOrderWithItems,
} from "./purchase-order.types";

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

const poRepoLayer = Layer.provide(
	PurchaseOrderRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, IPurchaseOrderRepository>) =>
	Effect.runPromise(Effect.provide(effect, poRepoLayer));

const seedFixtures = async (
	tenantId: TTenantId,
	prefix: string,
	supplierId: string,
	productId: string,
	variantId: string,
	userId: TUserId,
	createdByUserId: string,
) => {
	const db = await getDb();
	await db.execute(
		sql`INSERT INTO suppliers (id, business_id, name) VALUES (${supplierId}, ${tenantId}, ${`${prefix} Supplier`})`,
	);
	await db.execute(
		sql`INSERT INTO products (id, business_id, name, stock) VALUES (${productId}, ${tenantId}, ${`${prefix} Product`}, 0)`,
	);
	await db.execute(
		sql`INSERT INTO product_variants (id, product_id, business_id, name, price, stock) VALUES (${variantId}, ${productId}, ${tenantId}, 'Default', 1000, 0)`,
	);
	await db.execute(
		sql`INSERT INTO profiles (id, user_id, business_id, full_name, email) VALUES (${userId}, ${createdByUserId}, ${tenantId}, ${`${prefix} Profile`}, ${`${prefix}@example.com`})`,
	);
};

const buildOrderWithItems = (
	tenantId: TTenantId,
	supplierId: string,
	variantId: string,
	userId: TUserId,
	prefix: string,
): TPurchaseOrderWithItems => {
	const now = new Date();
	const poId = generateId<TPurchaseOrderId>();
	const poItemId = generateId<TPoItemId>();
	return {
		id: poId,
		tenantId,
		branchId: null,
		supplierId: supplierId as TPurchaseOrderWithItems["supplierId"],
		poNumber: `${prefix}-PO-001`,
		status: "draft",
		totalAmount: 5000,
		notes: `${prefix} Notes`,
		orderDate: now,
		expectedDate: null,
		createdBy: userId,
		createdAt: now,
		updatedAt: now,
		items: [
			{
				id: poItemId,
				poId,
				variantId:
					variantId as TPurchaseOrderWithItems["items"][number]["variantId"],
				qtyOrdered: 100,
				qtyReceived: 0,
				unitCost: 50,
				subtotal: 5000,
			},
		],
	};
};

describe.skipIf(!hasDb)(
	"purchase-order repository drizzle (integration)",
	() => {
		const tenantId = generateId<TTenantId>();
		const prefix = `__smoke_po_${Date.now()}`;

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
				sql`DELETE FROM stock_movements WHERE notes LIKE ${`Received from PO ${prefix}%`}`,
			);
			await db.execute(
				sql`DELETE FROM product_batches WHERE notes LIKE ${`Received from PO ${prefix}%`}`,
			);
			await db.execute(
				sql`DELETE FROM po_receiving_items WHERE receiving_id IN (SELECT id FROM po_receivings WHERE po_id IN (SELECT po_id.id FROM purchase_orders po_id WHERE po_id.po_number LIKE ${`${prefix}%`}))`,
			);
			await db.execute(
				sql`DELETE FROM po_receivings WHERE po_id IN (SELECT po_sub.id FROM purchase_orders po_sub WHERE po_sub.po_number LIKE ${`${prefix}%`})`,
			);
			await db.execute(
				sql`DELETE FROM po_items WHERE po_id IN (SELECT po_sub.id FROM purchase_orders po_sub WHERE po_sub.po_number LIKE ${`${prefix}%`})`,
			);
			await db.execute(
				sql`DELETE FROM purchase_orders WHERE po_number LIKE ${`${prefix}%`}`,
			);
			await db.execute(
				sql`DELETE FROM profiles WHERE email LIKE ${`${prefix}%`}`,
			);
			await db.execute(
				sql`DELETE FROM products WHERE name LIKE ${`${prefix}%`}`,
			);
			await db.execute(
				sql`DELETE FROM suppliers WHERE name LIKE ${`${prefix}%`}`,
			);
			await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
		});

		it("saves a purchase order with items", async () => {
			const supplierId = generateId();
			const productId = generateId();
			const variantId = generateId();
			const userId = generateId<TUserId>();
			const createdByUserId = generateId();

			await seedFixtures(
				tenantId,
				prefix,
				supplierId,
				productId,
				variantId,
				userId,
				createdByUserId,
			);

			const order = buildOrderWithItems(
				tenantId,
				supplierId,
				variantId,
				userId,
				prefix,
			);

			await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.saveOrderWithItems(order)),
				),
			);

			const db = await getDb();
			const poResult = await db.execute(
				sql`SELECT id, po_number, status, total_amount FROM purchase_orders WHERE id = ${order.id}`,
			);
			expect(poResult.rows[0]?.po_number).toBe(`${prefix}-PO-001`);
			expect(Number(poResult.rows[0]?.total_amount)).toBe(5000);

			const itemsResult = await db.execute(
				sql`SELECT id, qty_ordered FROM po_items WHERE po_id = ${order.id}`,
			);
			expect(itemsResult.rows.length).toBe(1);
			expect(Number(itemsResult.rows[0]?.qty_ordered)).toBe(100);
		}, 15000);

		it("finds all purchase orders for a tenant", async () => {
			const supplierId = generateId();
			const productId = generateId();
			const variantId = generateId();
			const userId = generateId<TUserId>();
			const createdByUserId = generateId();

			await seedFixtures(
				tenantId,
				prefix,
				supplierId,
				productId,
				variantId,
				userId,
				createdByUserId,
			);

			const order = buildOrderWithItems(
				tenantId,
				supplierId,
				variantId,
				userId,
				prefix,
			);

			await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.saveOrderWithItems(order)),
				),
			);

			const all = await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.findAll(tenantId)),
				),
			);

			const matched = all.find((po) => po.id === order.id);
			expect(matched).toBeDefined();
			expect(matched?.poNumber).toBe(`${prefix}-PO-001`);
		}, 15000);

		it("finds a purchase order by id with items", async () => {
			const supplierId = generateId();
			const productId = generateId();
			const variantId = generateId();
			const userId = generateId<TUserId>();
			const createdByUserId = generateId();

			await seedFixtures(
				tenantId,
				prefix,
				supplierId,
				productId,
				variantId,
				userId,
				createdByUserId,
			);

			const order = buildOrderWithItems(
				tenantId,
				supplierId,
				variantId,
				userId,
				prefix,
			);

			await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.saveOrderWithItems(order)),
				),
			);

			const found = await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.findById(order.id, tenantId)),
				),
			);

			expect(found).not.toBeNull();
			expect(found?.id).toBe(order.id);
			expect(found?.items.length).toBe(1);
			expect(found?.items[0]?.qtyOrdered).toBe(100);
		}, 15000);

		it("returns null when purchase order not found", async () => {
			const found = await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) =>
						repo.findById(generateId<TPurchaseOrderId>(), tenantId),
					),
				),
			);
			expect(found).toBeNull();
		}, 15000);

		it("updates a purchase order status", async () => {
			const supplierId = generateId();
			const productId = generateId();
			const variantId = generateId();
			const userId = generateId<TUserId>();
			const createdByUserId = generateId();

			await seedFixtures(
				tenantId,
				prefix,
				supplierId,
				productId,
				variantId,
				userId,
				createdByUserId,
			);

			const order = buildOrderWithItems(
				tenantId,
				supplierId,
				variantId,
				userId,
				prefix,
			);

			await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.saveOrderWithItems(order)),
				),
			);

			await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) =>
						repo.updateOrderStatus(order.id, tenantId, "sent"),
					),
				),
			);

			const db = await getDb();
			const result = await db.execute(
				sql`SELECT status FROM purchase_orders WHERE id = ${order.id}`,
			);
			expect(result.rows[0]?.status).toBe("sent");
		}, 15000);

		it("receives a purchase order atomically (RPC port)", async () => {
			const supplierId = generateId();
			const productId = generateId();
			const variantId = generateId();
			const userId = generateId<TUserId>();
			const createdByUserId = generateId();

			await seedFixtures(
				tenantId,
				prefix,
				supplierId,
				productId,
				variantId,
				userId,
				createdByUserId,
			);

			const order = buildOrderWithItems(
				tenantId,
				supplierId,
				variantId,
				userId,
				prefix,
			);

			await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) => repo.saveOrderWithItems(order)),
				),
			);

			const receivingId = generateId();
			const receivingItemId = generateId<TPoItemId>();

			const result = await run(
				IPurchaseOrderRepositoryTag.pipe(
					Effect.flatMap((repo) =>
						repo.receivePurchaseOrder(
							{
								receivingId,
								poId: order.id,
								notes: `${prefix} Receiving notes`,
								receivedDate: new Date(),
								receivedBy: createdByUserId,
								items: [
									{
										id: receivingItemId,
										poItemId: order.items[0]?.id ?? generateId(),
										qtyReceived: 100,
										expiryDate: null,
										batchNumber: `${prefix}-BATCH-001`,
										variantId,
										unitCost: 50,
									},
								],
							},
							tenantId,
						),
					),
				),
			);

			expect(result.receivingId).toBe(receivingId);
			expect(result.newStatus).toBe("received");

			const db = await getDb();

			const poResult = await db.execute(
				sql`SELECT status FROM purchase_orders WHERE id = ${order.id}`,
			);
			expect(poResult.rows[0]?.status).toBe("received");

			const itemResult = await db.execute(
				sql`SELECT qty_received FROM po_items WHERE id = ${order.items[0]?.id}`,
			);
			expect(Number(itemResult.rows[0]?.qty_received)).toBe(100);

			const batchResult = await db.execute(
				sql`SELECT quantity, po_id, supplier_id FROM product_batches WHERE po_id = ${order.id}`,
			);
			expect(Number(batchResult.rows[0]?.quantity)).toBe(100);
			expect(batchResult.rows[0]?.supplier_id).toBe(supplierId);

			const movementResult = await db.execute(
				sql`SELECT type, quantity, reference_type FROM stock_movements WHERE reference_id = ${order.id}`,
			);
			expect(movementResult.rows[0]?.type).toBe("in");
			expect(Number(movementResult.rows[0]?.quantity)).toBe(100);
			expect(movementResult.rows[0]?.reference_type).toBe("po");
		}, 20000);
	},
);
