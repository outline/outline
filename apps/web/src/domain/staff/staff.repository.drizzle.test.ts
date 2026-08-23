import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IStaffRepository } from "./staff.repository";
import { StaffRepositoryDrizzle } from "./staff.repository.drizzle";

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

const staffRepoLayer = Layer.provide(StaffRepositoryDrizzle, DrizzleClientLive);

const run = <A, E>(effect: Effect.Effect<A, E, IStaffRepository>) =>
	Effect.runPromise(Effect.provide(effect, staffRepoLayer));

describe.skipIf(!hasDb)("staff repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const prefix = `__smoke_staff_${Date.now()}`;
	const ownerUserId = generateId();

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id, slug) VALUES (${tenantId}, ${`${prefix} Business`}, ${ownerUserId}, ${`${prefix}-slug`}) ON CONFLICT (id) DO NOTHING`,
		);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM branch_members WHERE user_id IN (SELECT user_id FROM profiles WHERE email LIKE ${`${prefix}%`})`,
		);
		await db.execute(
			sql`DELETE FROM user_roles WHERE user_id IN (SELECT user_id FROM profiles WHERE email LIKE ${`${prefix}%`})`,
		);
		await db.execute(
			sql`DELETE FROM profiles WHERE email LIKE ${`${prefix}%`}`,
		);
		await db.execute(sql`DELETE FROM branches WHERE business_id = ${tenantId}`);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
	});

	it("finds user id by email", async () => {
		const userId = generateId() as TUserId;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email) VALUES (${userId}, ${tenantId}, ${`${prefix} Lookup`}, ${`${prefix}@test.com`})`,
		);

		const found = await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) => repo.findUserIdByEmail(`${prefix}@test.com`)),
			),
		);

		expect(found).toBe(userId);
	}, 15000);

	it("returns null for missing email", async () => {
		const found = await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findUserIdByEmail(`${prefix}__nonexistent@test.com`),
				),
			),
		);

		expect(found).toBeNull();
	}, 15000);

	it("invites staff and assigns branch + role atomically", async () => {
		const userId = generateId() as TUserId;
		const branchId = generateId() as TBranchId;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} Branch`}, true)`,
		);
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email) VALUES (${userId}, ${tenantId}, ${`${prefix} Invite Target`}, ${`${prefix}invite@test.com`})`,
		);

		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.inviteStaff({ userId, branchId, role: "kasir" }, tenantId),
				),
			),
		);

		const memberCheck = await db.execute(
			sql`SELECT 1 FROM branch_members WHERE user_id = ${userId} AND branch_id = ${branchId}`,
		);
		expect(memberCheck.rows.length).toBe(1);

		const roleCheck = await db.execute(
			sql`SELECT role FROM user_roles WHERE user_id = ${userId} AND business_id = ${tenantId}`,
		);
		expect(roleCheck.rows.length).toBe(1);
		expect(roleCheck.rows[0]?.role).toBe("kasir");
	}, 15000);

	it("inviteStaff is idempotent (re-running with same role is a no-op)", async () => {
		const userId = generateId() as TUserId;
		const branchId = generateId() as TBranchId;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} Idempotent Branch`}, true)`,
		);
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email) VALUES (${userId}, ${tenantId}, ${`${prefix} Idempotent`}, ${`${prefix}idempotent@test.com`})`,
		);

		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.inviteStaff({ userId, branchId, role: "manager" }, tenantId),
				),
			),
		);
		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.inviteStaff({ userId, branchId, role: "manager" }, tenantId),
				),
			),
		);

		const roleCheck = await db.execute(
			sql`SELECT COUNT(*)::int AS cnt FROM user_roles WHERE user_id = ${userId} AND business_id = ${tenantId} AND role = 'manager'`,
		);
		expect(Number(roleCheck.rows[0]?.cnt)).toBe(1);
	}, 15000);

	it("finds all staff members with branches", async () => {
		const userId = generateId() as TUserId;
		const otherUserId = generateId() as TUserId;
		const branchId = generateId() as TBranchId;
		const otherBranchId = generateId() as TBranchId;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} Find Branch 1`}, true)`,
		);
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${otherBranchId}, ${tenantId}, ${`${prefix} Find Branch 2`}, true)`,
		);
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email) VALUES (${userId}, ${tenantId}, ${`${prefix} Find User`}, ${`${prefix}find@test.com`})`,
		);
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email) VALUES (${otherUserId}, ${tenantId}, ${`${prefix} Other User`}, ${`${prefix}other@test.com`})`,
		);

		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.inviteStaff({ userId, branchId, role: "manager" }, tenantId),
				),
			),
		);
		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.inviteStaff(
						{ userId: otherUserId, branchId: otherBranchId, role: "kasir" },
						tenantId,
					),
				),
			),
		);

		const staff = await run(
			IStaffRepository.pipe(Effect.flatMap((repo) => repo.findAll(tenantId))),
		);

		const findUser = staff.find((m) => m.userId === userId);
		expect(findUser).toBeDefined();
		expect(findUser?.fullName).toBe(`${prefix} Find User`);
		expect(findUser?.role).toBe("manager");
		expect(findUser?.branches.some((b) => b.id === branchId)).toBe(true);

		const otherUser = staff.find((m) => m.userId === otherUserId);
		expect(otherUser?.role).toBe("kasir");
		expect(otherUser?.branches.some((b) => b.id === otherBranchId)).toBe(true);
	}, 15000);

	it("removes a user from a branch", async () => {
		const userId = generateId() as TUserId;
		const branchId = generateId() as TBranchId;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} Remove Branch`}, true)`,
		);
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email) VALUES (${userId}, ${tenantId}, ${`${prefix} Remove User`}, ${`${prefix}remove@test.com`})`,
		);

		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.inviteStaff({ userId, branchId, role: "kasir" }, tenantId),
				),
			),
		);

		const beforeRemove = await db.execute(
			sql`SELECT 1 FROM branch_members WHERE user_id = ${userId} AND branch_id = ${branchId}`,
		);
		expect(beforeRemove.rows.length).toBe(1);

		await run(
			IStaffRepository.pipe(
				Effect.flatMap((repo) =>
					repo.removeFromBranch(userId, branchId, tenantId),
				),
			),
		);

		const afterRemove = await db.execute(
			sql`SELECT 1 FROM branch_members WHERE user_id = ${userId} AND branch_id = ${branchId}`,
		);
		expect(afterRemove.rows.length).toBe(0);
	}, 15000);
});
