// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { ILoyaltyRepository } from "./loyalty.repository";
import { ILoyaltyRepository as ILoyaltyRepositoryTag } from "./loyalty.repository";
import { LoyaltyRepositoryDrizzle } from "./loyalty.repository.drizzle";
import type { TCustomerLoyaltyId, TPointsTransactionId } from "./loyalty.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const loyaltyRepoLayer = Layer.provide(
	LoyaltyRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, ILoyaltyRepository>) =>
	Effect.runPromise(Effect.provide(effect, loyaltyRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = (): Promise<DrizzleClient> =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

describe.skipIf(!hasDb)("loyalty repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const ownerId = generateId<string>();
	const prefix = `__smoke_loy_${Date.now()}`;
	const ownerEmail = `${prefix}_owner@example.com`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(sql`
			INSERT INTO users (id, email, password_hash)
			VALUES (${ownerId}, ${ownerEmail}, 'pw')
			ON CONFLICT (email) DO NOTHING
		`);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${ownerId}) ON CONFLICT (id) DO NOTHING`,
		);
		await db.execute(sql`
			INSERT INTO user_roles (user_id, business_id, role)
			VALUES (${ownerId}, ${tenantId}, 'owner')
			ON CONFLICT (user_id, business_id, role) DO NOTHING
		`);
	}, 20000);

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM loyalty_transactions WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM loyalty_tiers WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM loyalty_config WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM customer_loyalty WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM customers WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM user_roles WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}::uuid`);
		await db.execute(sql`DELETE FROM users WHERE email = ${ownerEmail}`);
	});

	const seedCustomer = async (
		db: DrizzleClient,
		opts: {
			customerLoyaltyId: string;
			customerId: string;
			phone: string;
			name: string;
			total: number;
		},
	): Promise<void> => {
		await db.execute(
			sql`INSERT INTO customers (id, business_id, full_name, phone, is_active) VALUES (${opts.customerId}, ${tenantId}, ${opts.name}, ${opts.phone}, true)`,
		);
		await db.execute(
			sql`INSERT INTO customer_loyalty (id, business_id, customer_id, customer_phone, customer_name, total_points, available_points) VALUES (${opts.customerLoyaltyId}, ${tenantId}, ${opts.customerId}, ${opts.phone}, ${opts.name}, ${opts.total}, ${opts.total})`,
		);
	};

	it("returns null when no config exists", async () => {
		const config = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.getConfig(tenantId)),
			),
		);
		expect(config).toBeNull();
	}, 15000);

	it("upserts and reads loyalty config", async () => {
		await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.updateConfig({
						businessId: tenantId,
						pointsPerRupiah: 0.05,
						pointsExpiryDays: 180,
						minRedeemPoints: 50,
						isActive: true,
					}),
				),
			),
		);

		const config = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.getConfig(tenantId)),
			),
		);
		expect(config).not.toBeNull();
		expect(config?.businessId).toBe(tenantId);
		expect(config?.pointsPerRupiah).toBeCloseTo(0.05);
		expect(config?.minRedeemPoints).toBe(50);
		expect(config?.isActive).toBe(true);
	}, 15000);

	it("lists loyalty tiers ordered by minPoints", async () => {
		const goldId = generateId();
		const silverId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO loyalty_tiers (id, business_id, name, min_points, discount_percent) VALUES (${silverId}, ${tenantId}, 'Silver', 0, 5)`,
		);
		await db.execute(
			sql`INSERT INTO loyalty_tiers (id, business_id, name, min_points, discount_percent) VALUES (${goldId}, ${tenantId}, 'Gold', 1000, 10)`,
		);

		const tiers = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.getTiers(tenantId)),
			),
		);
		expect(tiers.length).toBeGreaterThanOrEqual(2);
		expect(tiers[0]?.minPoints).toBe(0);
		expect(tiers[1]?.minPoints).toBe(1000);
		expect(tiers[0]?.name).toBe("Silver");
		expect(tiers[1]?.name).toBe("Gold");
	}, 15000);

	it("finds customer by phone and by id", async () => {
		const customerLoyaltyId = generateId<TCustomerLoyaltyId>();
		const customerLoyaltyUuid = customerLoyaltyId as unknown as string;
		const customerId = generateId();
		const phone = `${prefix}_phone_1`;

		const db = await getDb();
		await seedCustomer(db, {
			customerLoyaltyId: customerLoyaltyUuid,
			customerId,
			phone,
			name: "Cici",
			total: 250,
		});

		const byPhone = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.findCustomerByPhone(tenantId, phone)),
			),
		);
		expect(byPhone?.id).toBe(customerLoyaltyUuid);
		expect(byPhone?.customerName).toBe("Cici");
		expect(byPhone?.totalPoints).toBe(250);

		const byId = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.findCustomerById(tenantId, customerId)),
			),
		);
		expect(byId?.customerPhone).toBe(phone);
		expect(byId?.totalPoints).toBe(250);
	}, 15000);

	it("updates customer points and saves points transactions", async () => {
		const customerLoyaltyId = generateId<TCustomerLoyaltyId>();
		const customerLoyaltyUuid = customerLoyaltyId as unknown as string;
		const customerId = generateId();
		const phone = `${prefix}_phone_2`;

		const db = await getDb();
		await seedCustomer(db, {
			customerLoyaltyId: customerLoyaltyUuid,
			customerId,
			phone,
			name: "Dodi",
			total: 0,
		});

		await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.updateCustomerPoints(tenantId, customerLoyaltyUuid, 750),
				),
			),
		);

		const updated = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.findCustomerByPhone(tenantId, phone)),
			),
		);
		expect(updated?.totalPoints).toBe(750);

		const txId = generateId<TPointsTransactionId>();
		const txUuid = txId as unknown as string;
		await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.savePointsTransaction({
						id: txUuid as TPointsTransactionId,
						tenantId,
						customerLoyaltyId,
						type: "earn",
						points: 100,
						description: `${prefix} manual tx`,
						orderId: null,
						createdAt: new Date(),
					}),
				),
			),
		);

		const transactions = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.getPointsTransactions(tenantId, customerLoyaltyUuid),
				),
			),
		);
		expect(transactions.length).toBeGreaterThanOrEqual(1);
		expect(transactions.some((t) => t.id === txUuid)).toBe(true);
	}, 15000);

	it("atomicEarnPoints inserts transaction and updates balance", async () => {
		const customerLoyaltyId = generateId<TCustomerLoyaltyId>();
		const customerLoyaltyUuid = customerLoyaltyId as unknown as string;
		const customerId = generateId();
		const txId = generateId<TPointsTransactionId>();
		const txUuid = txId as unknown as string;
		const phone = `${prefix}_phone_earn`;

		const db = await getDb();
		await seedCustomer(db, {
			customerLoyaltyId: customerLoyaltyUuid,
			customerId,
			phone,
			name: "Earn",
			total: 100,
		});

		const newTotal = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.atomicEarnPoints({
						tenantId,
						customerLoyaltyId,
						transactionId: txId,
						points: 50,
						orderId: null,
						description: `${prefix} earn`,
					}),
				),
			),
		);
		expect(newTotal).toBe(150);

		const updated = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.findCustomerByPhone(tenantId, phone)),
			),
		);
		expect(updated?.totalPoints).toBe(150);

		const transactions = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.getPointsTransactions(tenantId, customerLoyaltyUuid),
				),
			),
		);
		expect(transactions.some((t) => t.id === txUuid)).toBe(true);
		expect(transactions.some((t) => t.id === txUuid && t.points === 50)).toBe(
			true,
		);
	}, 15000);

	it("atomicRedeemPoints deducts points and rejects overdraw", async () => {
		const customerLoyaltyId = generateId<TCustomerLoyaltyId>();
		const customerLoyaltyUuid = customerLoyaltyId as unknown as string;
		const customerId = generateId();
		const txId = generateId<TPointsTransactionId>();
		const txUuid = txId as unknown as string;
		const phone = `${prefix}_phone_redeem`;

		const db = await getDb();
		await seedCustomer(db, {
			customerLoyaltyId: customerLoyaltyUuid,
			customerId,
			phone,
			name: "Redeem",
			total: 200,
		});

		const newTotal = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.atomicRedeemPoints({
						tenantId,
						customerLoyaltyId,
						transactionId: txId,
						points: 80,
						orderId: null,
						description: `${prefix} redeem`,
					}),
				),
			),
		);
		expect(newTotal).toBe(120);

		const updated = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.findCustomerByPhone(tenantId, phone)),
			),
		);
		expect(updated?.totalPoints).toBe(120);

		const transactions = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.getPointsTransactions(tenantId, customerLoyaltyUuid),
				),
			),
		);
		expect(transactions.some((t) => t.id === txUuid)).toBe(true);
		expect(
			transactions.some((t) => t.id === txUuid && t.type === "redeem"),
		).toBe(true);

		const overdraft = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.atomicRedeemPoints({
						tenantId,
						customerLoyaltyId,
						transactionId: generateId<TPointsTransactionId>(),
						points: 99999,
						orderId: null,
						description: `${prefix} overdraft`,
					}),
				),
			),
		).catch((e: unknown) => e);

		expect(overdraft).toBeInstanceOf(Error);
		const overdraftStr = JSON.stringify(overdraft);
		expect(overdraftStr).toMatch(/Insufficient points/i);
	}, 20000);

	it("updateCustomerPoints + getPointsTransactions enforce tenant scope", async () => {
		const customerLoyaltyId = generateId<TCustomerLoyaltyId>();
		const customerLoyaltyUuid = customerLoyaltyId as unknown as string;
		const customerId = generateId();
		const phone = `${prefix}_phone_isolation`;
		const foreignTenantId = generateId<TTenantId>();
		const txId = generateId<TPointsTransactionId>();
		const txUuid = txId as unknown as string;

		const db = await getDb();
		await seedCustomer(db, {
			customerLoyaltyId: customerLoyaltyUuid,
			customerId,
			phone,
			name: "Isolation",
			total: 250,
		});
		await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.savePointsTransaction({
						id: txId,
						tenantId,
						customerLoyaltyId,
						type: "earn",
						points: 100,
						description: `${prefix} isolation tx`,
						orderId: null,
						createdAt: new Date(),
					}),
				),
			),
		);

		await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.updateCustomerPoints(
						foreignTenantId,
						customerLoyaltyUuid,
						99999,
					),
				),
			),
		);

		const foreignTxns = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.getPointsTransactions(foreignTenantId, customerLoyaltyUuid),
				),
			),
		);
		expect(foreignTxns).toEqual([]);

		const ownerView = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) => repo.findCustomerByPhone(tenantId, phone)),
			),
		);
		expect(ownerView?.totalPoints).toBe(250);

		const ownerTxns = await run(
			ILoyaltyRepositoryTag.pipe(
				Effect.flatMap((repo) =>
					repo.getPointsTransactions(tenantId, customerLoyaltyUuid),
				),
			),
		);
		expect(ownerTxns.some((t) => t.id === txUuid)).toBe(true);
	}, 15000);
});
