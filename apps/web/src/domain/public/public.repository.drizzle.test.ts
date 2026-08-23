// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import {
	branches,
	businesses,
	products,
	rooms,
} from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IPublicRepository } from "./public.repository";
import { PublicRepositoryDrizzle } from "./public.repository.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);

const publicRepoLayer = Layer.provide(
	PublicRepositoryDrizzle,
	DrizzleClientLive,
);

const runWithRepo = <A, E>(
	effect: Effect.Effect<A, E, IPublicRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, publicRepoLayer));

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

describe.skipIf(!hasDb)("public repository (integration)", () => {
	const prefix = `__smoke_public_${Date.now()}`;
	const tenantId = generateId<TTenantId>();
	const slug = `${prefix}-slug`;
	const branchId = generateId<TTenantId>();
	const roomActiveId = generateId<TTenantId>();
	const roomInactiveId = generateId<TTenantId>();
	const productId = generateId<TTenantId>();

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();

		// `businesses.owner_id` is NOT a foreign key (it isn't wired back to
		// `users.id`); any UUID is enough to satisfy NOT NULL. FKs that DO
		// exist here: branches/rooms/products.business_id → businesses.id,
		// rooms.branch_id → branches.id.
		await db.insert(businesses).values({
			id: tenantId,
			name: `${prefix}_business`,
			ownerId: crypto.randomUUID(),
			slug,
		});

		await db.insert(branches).values({
			id: branchId,
			businessId: tenantId,
			name: `${prefix}_branch`,
			capacity: 10,
		});

		await db.insert(rooms).values([
			{
				id: roomActiveId,
				businessId: tenantId,
				branchId,
				name: `${prefix}_active`,
				isActive: true,
			},
			{
				id: roomInactiveId,
				businessId: tenantId,
				branchId,
				name: `${prefix}_inactive`,
				isActive: false,
			},
		]);

		await db.insert(products).values({
			id: productId,
			businessId: tenantId,
			name: `${prefix}_product`,
			price: "100.00",
		});
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// Explicit teardown is required because no cascade reaches
		// `businesses` from `users` — every cleanup predicate has to be
		// rooted at the smoke-test prefix on `slug` to stay hermetic.
		await db.execute(
			sql`DELETE FROM products WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM rooms WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM branches WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}::uuid`);
	});

	it("finds a business by slug", async () => {
		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IPublicRepository;
				return yield* repo.getBusinessBySlug(slug);
			}),
		);
		expect(result).not.toBeNull();
		expect(result?.id).toBe(tenantId);
		expect(result?.slug).toBe(slug);
		expect(result?.name).toBe(`${prefix}_business`);
	}, 15000);

	it("returns null when the slug does not exist", async () => {
		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IPublicRepository;
				return yield* repo.getBusinessBySlug("nonexistent-slug-xyz");
			}),
		);
		expect(result).toBeNull();
	}, 15000);

	it("lists branches for a business", async () => {
		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IPublicRepository;
				return yield* repo.getBranches(tenantId);
			}),
		);
		expect(result.length).toBeGreaterThanOrEqual(1);
		expect(result.some((b) => b.id === branchId)).toBe(true);
	}, 15000);

	it("returns only active rooms for a business", async () => {
		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IPublicRepository;
				return yield* repo.getRooms(tenantId);
			}),
		);
		const ids = result.map((r) => r.id);
		expect(ids).toContain(roomActiveId);
		expect(ids).not.toContain(roomInactiveId);
		expect(result.every((r) => r.isActive)).toBe(true);
	}, 15000);

	it("finds a single product by id scoped to a business", async () => {
		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IPublicRepository;
				return yield* repo.getProduct(tenantId, productId);
			}),
		);
		expect(result).not.toBeNull();
		expect(result?.id).toBe(productId);
		expect(result?.name).toBe(`${prefix}_product`);
		expect(result?.price).toBe(100);
	}, 15000);

	it("returns null when the product is missing for the business", async () => {
		const result = await runWithRepo(
			Effect.gen(function* () {
				const repo = yield* IPublicRepository;
				return yield* repo.getProduct(tenantId, crypto.randomUUID());
			}),
		);
		expect(result).toBeNull();
	}, 15000);
});
