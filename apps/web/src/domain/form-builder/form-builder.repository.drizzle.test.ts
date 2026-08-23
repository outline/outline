// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branches,
	businesses,
	customers,
	products,
	rooms,
} from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IFormBuilderRepository } from "./form-builder.repository";
import { FormBuilderRepositoryDrizzle } from "./form-builder.repository.drizzle";

const hasDb = Boolean(process.env.DATABASE_URL);

const formBuilderRepoLayer = Layer.provide(
	FormBuilderRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(
	effect: Effect.Effect<A, E, IFormBuilderRepository>,
): Promise<A> =>
	Effect.runPromise(Effect.provide(effect, formBuilderRepoLayer));

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

describe.skipIf(!hasDb)("form-builder repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const branchId = generateId<TTenantId>();
	const prefix = `__smoke_fb_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.insert(businesses).values({
			id: tenantId,
			name: `${prefix}_business`,
			ownerId: crypto.randomUUID(),
		});
		await db.insert(branches).values({
			id: branchId,
			businessId: tenantId,
			name: `${prefix}_branch`,
		});
		await db.insert(customers).values({
			businessId: tenantId,
			fullName: `${prefix} Ada Lovelace`,
			phone: `0811${Date.now()}`,
		});
		await db.insert(products).values({
			businessId: tenantId,
			name: `${prefix} Kibble Bag`,
			price: "50000",
		});
		await db.insert(rooms).values({
			businessId: tenantId,
			branchId,
			name: `${prefix} Suite A`,
			dailyRate: "150000",
		});
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM customers WHERE full_name LIKE ${`${prefix}%`}`,
		);
		await db.execute(sql`DELETE FROM products WHERE name LIKE ${`${prefix}%`}`);
		await db.execute(sql`DELETE FROM rooms WHERE name LIKE ${`${prefix}%`}`);
		await db.execute(sql`DELETE FROM branches WHERE name LIKE ${`${prefix}%`}`);
		await db.execute(
			sql`DELETE FROM businesses WHERE name LIKE ${`${prefix}%`}`,
		);
	});

	it("returns matching options for Customer doctype, scoped to tenantId", async () => {
		const options = await run(
			Effect.gen(function* () {
				const repo = yield* IFormBuilderRepository;
				return yield* repo.getLinkDoctypeOptions(tenantId, "Customer", "Ada");
			}),
		);
		expect(options.length).toBeGreaterThanOrEqual(1);
		expect(options[0]?.label).toContain("Ada");
	}, 15000);

	it("returns Room options filtered by search", async () => {
		const options = await run(
			Effect.gen(function* () {
				const repo = yield* IFormBuilderRepository;
				return yield* repo.getLinkDoctypeOptions(tenantId, "Room", "Suite");
			}),
		);
		expect(options.length).toBeGreaterThanOrEqual(1);
		expect(options[0]?.label).toContain("Suite");
	}, 15000);

	it("isolates options by tenantId (other tenant's data not visible)", async () => {
		const otherTenantId = generateId<TTenantId>();
		const options = await run(
			Effect.gen(function* () {
				const repo = yield* IFormBuilderRepository;
				return yield* repo.getLinkDoctypeOptions(
					otherTenantId,
					"Customer",
					"Ada",
				);
			}),
		);
		expect(options).toEqual([]);
	}, 15000);
});
