import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	DashboardRepository,
	type IDashboardRepository,
} from "./dashboard.repository";
import { DashboardRepositoryDrizzle } from "./dashboard.repository.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);

const dashboardRepoLayer = Layer.provide(
	DashboardRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, IDashboardRepository>) =>
	Effect.runPromise(Effect.provide(effect, dashboardRepoLayer));

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

describe.skipIf(!hasDb)("dashboard repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const otherTenantId = generateId<TTenantId>();
	const prefix = `__smoke_dash_${Date.now()}`;
	let branchId: string;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();

		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${generateId()})`,
		);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${otherTenantId}, ${`${prefix} Other Business`}, ${generateId()})`,
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
			sql`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id IN (${tenantId}, ${otherTenantId}))`,
		);
		await db.execute(
			sql`DELETE FROM orders WHERE business_id IN (${tenantId}, ${otherTenantId})`,
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

	it("returns top seller items for the tenant only", async () => {
		const db = await getDb();

		const productMine = generateId();
		const productOther = generateId();
		const orderMine = generateId();
		const orderOther = generateId();

		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock, price, category) VALUES (${productMine}, ${tenantId}, ${`${prefix} Mine Product`}, 100, 50000, ${`${prefix} Cat`})`,
		);
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock, price, category) VALUES (${productOther}, ${otherTenantId}, ${`${prefix} Other Product`}, 100, 99999, ${`${prefix} OtherCat`})`,
		);

		await db.execute(
			sql`INSERT INTO orders (id, business_id, branch_id, total_amount, created_by) VALUES (${orderMine}, ${tenantId}, ${branchId}, 150000, ${generateId()})`,
		);
		await db.execute(
			sql`INSERT INTO orders (id, business_id, branch_id, total_amount, created_by) VALUES (${orderOther}, ${otherTenantId}, ${branchId}, 99999, ${generateId()})`,
		);

		await db.execute(
			sql`INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (${orderMine}, ${productMine}, 3, 50000)`,
		);
		await db.execute(
			sql`INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (${orderOther}, ${productOther}, 1, 99999)`,
		);

		const items = await run(
			DashboardRepository.pipe(
				Effect.flatMap((repo) => repo.getTopSellerItems(tenantId)),
			),
		);

		const mine = items.find((i) => i.productId === productMine);
		const other = items.find((i) => i.productId === productOther);

		expect(mine).toBeDefined();
		expect(mine?.quantity).toBe(3);
		expect(mine?.revenue).toBe(150000);
		expect(mine?.name).toBe(`${prefix} Mine Product`);
		expect(mine?.category).toBe(`${prefix} Cat`);
		expect(other).toBeUndefined();
	}, 15000);

	it("returns empty array when tenant has no orders", async () => {
		const emptyTenantId = generateId<TTenantId>();
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${emptyTenantId}, ${`${prefix} Empty Business`}, ${generateId()})`,
		);

		try {
			const items = await run(
				DashboardRepository.pipe(
					Effect.flatMap((repo) => repo.getTopSellerItems(emptyTenantId)),
				),
			);
			expect(items).toEqual([]);
		} finally {
			await db.execute(sql`DELETE FROM businesses WHERE id = ${emptyTenantId}`);
		}
	}, 15000);

	it("returns inventory products scoped to tenant with totalCount of all tenant products", async () => {
		const db = await getDb();
		const inventoryProductIds: string[] = [];
		for (let i = 0; i < 6; i++) {
			const id = generateId();
			inventoryProductIds.push(id);
			await db.execute(
				sql`INSERT INTO products (id, business_id, name, stock, updated_at) VALUES (${id}, ${tenantId}, ${`${prefix} Inv ${i}`}, ${i * 10}, ${new Date(Date.now() - i * 1000).toISOString()})`,
			);
		}

		const productMineId = generateId();
		await db.execute(
			sql`INSERT INTO products (id, business_id, name, stock, price, category) VALUES (${productMineId}, ${tenantId}, ${`${prefix} Mine Product`}, 100, 50000, ${`${prefix} Cat`})`,
		);

		try {
			const result = await run(
				DashboardRepository.pipe(
					Effect.flatMap((repo) => repo.getInventoryProducts(tenantId)),
				),
			);

			expect(result.products.length).toBe(4);
			expect(result.totalCount).toBe(8);
			for (const product of result.products) {
				expect(product.name.startsWith(prefix)).toBe(true);
			}
		} finally {
			for (const id of inventoryProductIds) {
				await db.execute(sql`DELETE FROM products WHERE id = ${id}`);
			}
			await db.execute(sql`DELETE FROM products WHERE id = ${productMineId}`);
		}
	}, 15000);
});
