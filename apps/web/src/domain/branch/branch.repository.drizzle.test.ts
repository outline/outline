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
import { IBranchRepository } from "./branch.repository";
import { BranchRepositoryDrizzle } from "./branch.repository.drizzle";
import type { TBranchHolidayId, TBranchId } from "./branch.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const branchRepoLayer = Layer.provide(
	BranchRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(
	effect: Effect.Effect<A, E, IBranchRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, branchRepoLayer));

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

describe.skipIf(!hasDb)("branch repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const ownerId = generateId();
	const prefix = `__smoke_branch_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${ownerId}) ON CONFLICT (id) DO NOTHING`,
		);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM branch_holidays WHERE business_id = ${tenantId}`,
		);
		await db.execute(
			sql`DELETE FROM branch_members WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ${tenantId})`,
		);
		await db.execute(sql`DELETE FROM branches WHERE business_id = ${tenantId}`);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
	});

	it("creates a branch via the atomic RPC port and writes a branch_members row", async () => {
		const branchId = generateId<TBranchId>();
		const userId = generateId();

		await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				yield* repo.createBranch(
					{
						id: branchId,
						tenantId,
						name: `${prefix} Branch`,
						address: "Jl. Test 123",
						phone: "08123456789",
						isActive: true,
						email: null,
						whatsappNumber: null,
						streetAddress: null,
						addressLocality: null,
						addressRegion: null,
						postalCode: null,
						addressCountry: null,
						latitude: null,
						longitude: null,
						operatingHours: null,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
					userId,
				);
			}),
		);

		const db = await getDb();
		const branchRow = await db.execute<{ id: string; name: string }>(
			sql`SELECT id, name FROM branches WHERE id = ${branchId}`,
		);
		expect(branchRow.rows[0]?.id).toBe(branchId);
		expect(branchRow.rows[0]?.name).toBe(`${prefix} Branch`);

		const memberRow = await db.execute<{ branch_id: string; user_id: string }>(
			sql`SELECT branch_id, user_id FROM branch_members WHERE branch_id = ${branchId} AND user_id = ${userId}`,
		);
		expect(memberRow.rows[0]?.branch_id).toBe(branchId);
		expect(memberRow.rows[0]?.user_id).toBe(userId);
	}, 15000);

	it("finds a branch by id, scoped to the tenant", async () => {
		const branchId = generateId<TBranchId>();
		const userId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, address, phone, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} FindById`}, null, null, true)`,
		);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				return yield* repo.findById(branchId, tenantId);
			}),
		);

		expect(found).not.toBeNull();
		expect(found?.id).toBe(branchId);
		expect(found?.name).toBe(`${prefix} FindById`);
		expect(found?.tenantId).toBe(tenantId);

		const otherTenant = generateId<TTenantId>();
		const notFound = await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				return yield* repo.findById(branchId, otherTenant);
			}),
		);
		expect(notFound).toBeNull();

		void userId;
	}, 15000);

	it("lists all branches for a tenant, ordered by name", async () => {
		await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				return yield* repo.findAll(tenantId);
			}),
		).then((branches) => {
			const names = branches.map((b) => b.name);
			const sorted = [...names].sort((a, b) => a.localeCompare(b));
			expect(names).toEqual(sorted);
			expect(names.some((n) => n.startsWith(prefix))).toBe(true);
		});
	}, 15000);

	it("updates a branch's name, address, phone, and isActive", async () => {
		const branchId = generateId<TBranchId>();
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} ToUpdate`}, true)`,
		);

		const now = new Date();
		await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				yield* repo.update({
					id: branchId,
					tenantId,
					name: `${prefix} Updated`,
					address: "Jl. Updated",
					phone: "08999999",
					isActive: false,
					email: null,
					whatsappNumber: null,
					streetAddress: null,
					addressLocality: null,
					addressRegion: null,
					postalCode: null,
					addressCountry: null,
					latitude: null,
					longitude: null,
					operatingHours: null,
					createdAt: now,
					updatedAt: now,
				});
			}),
		);

		const row = await db.execute<{
			name: string;
			address: string | null;
			phone: string | null;
			is_active: boolean;
		}>(
			sql`SELECT name, address, phone, is_active FROM branches WHERE id = ${branchId}`,
		);
		expect(row.rows[0]?.name).toBe(`${prefix} Updated`);
		expect(row.rows[0]?.address).toBe("Jl. Updated");
		expect(row.rows[0]?.phone).toBe("08999999");
		expect(row.rows[0]?.is_active).toBe(false);
	}, 15000);

	it("saves, finds, and deletes branch holidays", async () => {
		const branchId = generateId<TBranchId>();
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} HolidayBranch`}, true)`,
		);

		const holidayId = generateId<TBranchHolidayId>();
		await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				yield* repo.saveHoliday({
					id: holidayId,
					branchId,
					tenantId,
					name: "Tahun Baru",
					date: new Date("2026-01-01T00:00:00Z"),
					isRecurring: true,
					createdAt: new Date(),
				});
			}),
		);

		const holidays = await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				return yield* repo.findHolidays(branchId, tenantId);
			}),
		);
		const found = holidays.find((h) => h.id === holidayId);
		expect(found).toBeDefined();
		expect(found?.name).toBe("Tahun Baru");
		expect(found?.isRecurring).toBe(true);

		await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				yield* repo.deleteHoliday(holidayId, branchId, tenantId);
			}),
		);

		const afterDelete = await run(
			Effect.gen(function* () {
				const repo = yield* IBranchRepository;
				return yield* repo.findHolidays(branchId, tenantId);
			}),
		);
		expect(afterDelete.find((h) => h.id === holidayId)).toBeUndefined();
	}, 15000);
});
