// @vitest-environment node
import { sql } from "drizzle-orm";
import { Cause, Context, Effect, Exit, Layer, Option, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { ICommissionRepository } from "./commission.repository";
import { CommissionRepository } from "./commission.repository";
import { CommissionRepositoryDrizzle } from "./commission.repository.drizzle";
import type { TCommissionRuleId, TKasbonId } from "./commission.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const commissionRepoLayer = Layer.provide(
	CommissionRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(
	effect: Effect.Effect<A, E, ICommissionRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, commissionRepoLayer));

/** For asserting on the typed failure channel rather than the generic promise rejection. */
const runExit = <A, E>(
	effect: Effect.Effect<A, E, ICommissionRepository>,
): Promise<Exit.Exit<A, E>> =>
	Effect.runPromiseExit(Effect.provide(effect, commissionRepoLayer));

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

describe.skipIf(!hasDb)("commission repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const ownerUserId = generateId<TUserId>();
	const staffUserId = generateId<TUserId>();
	const profileId = generateId();
	const prefix = `__smoke_comm_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// Owner user → owns the business
		await db.execute(
			sql`INSERT INTO users (id, email, password_hash) VALUES (${ownerUserId}, ${`${prefix}-owner@example.com`}, 'x')`,
		);
		// Staff user → referenced by profiles.userId, which is FK'd from commission_rules.staff_id
		await db.execute(
			sql`INSERT INTO users (id, email, password_hash) VALUES (${staffUserId}, ${`${prefix}-staff@example.com`}, 'x')`,
		);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${ownerUserId})`,
		);
		await db.execute(
			sql`INSERT INTO profiles (id, user_id, business_id, full_name, email) VALUES (${profileId}, ${staffUserId}, ${tenantId}, 'Smoke Staff', ${`${prefix}-staff@example.com`})`,
		);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// commission_rules has FK to businesses (cascade) AND to profiles.user_id.
		// Clear test-scoped rows first to avoid a leftover pointing at a
		// deleted profile, then drop the business (cascades the rest) and users.
		await db.execute(
			sql`DELETE FROM commission_rules WHERE business_id = ${tenantId}`,
		);
		await db.execute(
			sql`DELETE FROM commission_records WHERE business_id = ${tenantId}`,
		);
		await db.execute(
			sql`DELETE FROM kasbon_payments WHERE kasbon_id IN (SELECT id FROM kasbon WHERE business_id = ${tenantId})`,
		);
		await db.execute(sql`DELETE FROM kasbon WHERE business_id = ${tenantId}`);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
		await db.execute(sql`DELETE FROM users WHERE email LIKE ${`${prefix}%`}`);
	});

	it("saves and finds a commission rule by staff id", async () => {
		const saved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveRule({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						model: "percentage",
						ratePercent: 10,
						rateFixed: 0,
						rateSmall: 0,
						rateMedium: 0,
						rateLarge: 0,
						rateXl: 0,
						includeAddons: false,
						isActive: true,
					}),
				),
			),
		);

		expect(saved.id).toBeTruthy();
		expect(saved.tenantId).toBe(tenantId);
		expect(saved.staffId).toBe(staffUserId);
		expect(saved.model).toBe("percentage");
		expect(saved.ratePercent).toBe(10);

		const found = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findRuleByStaffId(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);
		expect(found?.id).toBe(saved.id);
		expect(found?.ratePercent).toBe(10);
	}, 15000);

	it("updates a commission rule", async () => {
		// Save fresh row to update, then verify it lands.
		const saved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveRule({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						model: "percentage",
						ratePercent: 5,
						rateFixed: 0,
						rateSmall: 0,
						rateMedium: 0,
						rateLarge: 0,
						rateXl: 0,
						includeAddons: false,
						isActive: true,
					}),
				),
			),
		);

		const updated = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.updateRule(saved.id as TCommissionRuleId, tenantId, {
						ratePercent: 20,
						isActive: false,
					}),
				),
			),
		);

		expect(updated.ratePercent).toBe(20);
		expect(updated.isActive).toBe(false);
	}, 15000);

	it("fails to update a missing rule with CommissionRuleNotFoundError", async () => {
		const missingId = generateId() as TCommissionRuleId;
		const exit = await runExit(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.updateRule(missingId, tenantId, { ratePercent: 99 }),
				),
			),
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const failure = Cause.failureOption(exit.cause);
			expect(Option.isSome(failure)).toBe(true);
			if (Option.isSome(failure)) {
				expect(failure.value._tag).toBe("CommissionRuleNotFoundError");
			}
		}
	}, 15000);

	it("saves commission records and finds them by staff id", async () => {
		const referenceId = generateId();
		const saved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveRecord({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						referenceType: "order",
						referenceId,
						amount: 15000,
					}),
				),
			),
		);

		expect(saved.id).toBeTruthy();
		expect(saved.status).toBe("pending");
		expect(saved.amount).toBe(15000);
		expect(saved.referenceId).toBe(referenceId);

		const records = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findRecordsByStaffId(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);
		expect(records.length).toBeGreaterThanOrEqual(1);
		expect(records.some((r) => r.id === saved.id)).toBe(true);
	}, 15000);

	it("marks pending records as paid", async () => {
		const saved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveRecord({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						referenceType: "grooming",
						referenceId: generateId(),
						amount: 5000,
					}),
				),
			),
		);

		await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.markRecordsAsPaid(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);

		const records = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findRecordsByStaffId(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);
		const updated = records.find((r) => r.id === saved.id);
		expect(updated?.status).toBe("paid");
		expect(updated?.paidAt).not.toBeNull();
	}, 15000);

	it("saves a kasbon and finds it by staff id", async () => {
		const saved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveKasbon({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						amount: 500000,
						installmentAmount: 50000,
						notes: `${prefix} test kasbon`,
					}),
				),
			),
		);

		expect(saved.id).toBeTruthy();
		expect(saved.remaining).toBe(500000);
		expect(saved.status).toBe("active");

		const kasbons = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findKasbonByStaffId(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);
		expect(kasbons.some((k) => k.id === saved.id)).toBe(true);
	}, 15000);

	it("addKasbonPayment (RPC port) inserts a payment and decrements remaining", async () => {
		const kasbonSaved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveKasbon({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						amount: 100000,
						installmentAmount: 25000,
						notes: `${prefix} atomic payment kasbon`,
					}),
				),
			),
		);

		const payment = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.addKasbonPayment(
						{
							kasbonId: kasbonSaved.id as TKasbonId,
							amount: 40000,
							source: "manual",
						},
						tenantId,
					),
				),
			),
		);

		expect(payment.id).toBeTruthy();
		expect(payment.kasbonId).toBe(kasbonSaved.id);
		expect(payment.amount).toBe(40000);
		expect(payment.source).toBe("manual");

		// Verify the kasbon's remaining balance was decremented in the
		// same transaction that inserted the payment — this is what the
		// RPC used to guarantee. If the RPC returned success but the
		// kasbon wasn't updated, the regression surfaces here.
		const kasbons = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findKasbonByStaffId(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);
		const updatedKasbon = kasbons.find((k) => k.id === kasbonSaved.id);
		expect(updatedKasbon?.remaining).toBe(60000);
		expect(updatedKasbon?.status).toBe("active");
	}, 15000);

	it("addKasbonPayment flips status to paid_off when remaining reaches zero", async () => {
		const kasbonSaved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveKasbon({
						tenantId,
						staffId:
							staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						amount: 20000,
						installmentAmount: 20000,
						notes: `${prefix} full-payment kasbon`,
					}),
				),
			),
		);

		const payment = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.addKasbonPayment(
						{
							kasbonId: kasbonSaved.id as TKasbonId,
							amount: 20000,
							source: "manual",
						},
						tenantId,
					),
				),
			),
		);
		expect(payment.id).toBeTruthy();

		const kasbons = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findKasbonByStaffId(
						staffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						tenantId,
					),
				),
			),
		);
		const updatedKasbon = kasbons.find((k) => k.id === kasbonSaved.id);
		expect(updatedKasbon?.remaining).toBe(0);
		expect(updatedKasbon?.status).toBe("paid_off");
	}, 15000);

	it("addKasbonPayment fails with KasbonNotFoundError when kasbon does not exist", async () => {
		const missingKasbonId = generateId() as TKasbonId;
		const exit = await runExit(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.addKasbonPayment(
						{
							kasbonId: missingKasbonId,
							amount: 10000,
							source: "manual",
						},
						tenantId,
					),
				),
			),
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const failure = Cause.failureOption(exit.cause);
			expect(Option.isSome(failure)).toBe(true);
			if (Option.isSome(failure)) {
				expect(failure.value._tag).toBe("KasbonNotFoundError");
			}
		}
	}, 15000);

	it("addKasbonPayment fails with KasbonNotFoundError when kasbon belongs to another business", async () => {
		// Build a second tenant so we can prove the cross-tenant guard
		// matches the RPC's `business_id <> p_business_id` raise.
		const otherTenantId = generateId<TTenantId>();
		const otherOwnerId = generateId<TUserId>();
		const otherStaffUserId = generateId<TUserId>();
		const otherProfileId = generateId();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO users (id, email, password_hash) VALUES (${otherOwnerId}, ${`${prefix}-other-owner@example.com`}, 'x')`,
		);
		await db.execute(
			sql`INSERT INTO users (id, email, password_hash) VALUES (${otherStaffUserId}, ${`${prefix}-other-staff@example.com`}, 'x')`,
		);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${otherTenantId}, ${`${prefix} Other Business`}, ${otherOwnerId})`,
		);
		await db.execute(
			sql`INSERT INTO profiles (id, user_id, business_id, full_name, email) VALUES (${otherProfileId}, ${otherStaffUserId}, ${otherTenantId}, 'Other Staff', ${`${prefix}-other-staff@example.com`})`,
		);

		const kasbonSaved = await run(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveKasbon({
						tenantId: otherTenantId,
						staffId:
							otherStaffUserId as unknown as import("@/domain/staff/staff.types").TStaffId,
						amount: 50000,
						installmentAmount: 10000,
						notes: `${prefix} cross-tenant kasbon`,
					}),
				),
			),
		);

		const exit = await runExit(
			CommissionRepository.pipe(
				Effect.flatMap((repo) =>
					repo.addKasbonPayment(
						{
							kasbonId: kasbonSaved.id as TKasbonId,
							amount: 10000,
							source: "manual",
						},
						tenantId, // wrong tenant on purpose
					),
				),
			),
		);

		// Direct cleanup — otherTenantId cascades remove kasbon rows
		// and other profiles under it.
		await db.execute(
			sql`DELETE FROM kasbon_payments WHERE kasbon_id IN (SELECT id FROM kasbon WHERE business_id = ${otherTenantId})`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${otherTenantId}`);
		await db.execute(
			sql`DELETE FROM users WHERE email LIKE ${`${prefix}-other-%`}`,
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const failure = Cause.failureOption(exit.cause);
			expect(Option.isSome(failure)).toBe(true);
			if (Option.isSome(failure)) {
				expect(failure.value._tag).toBe("KasbonNotFoundError");
			}
		}
	}, 15000);
});
