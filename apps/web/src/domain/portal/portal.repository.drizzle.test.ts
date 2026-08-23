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
	portalServices,
} from "@/infra/db/drizzle/schema";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IPortalRepository } from "./portal.repository";
import { PortalRepositoryDrizzle } from "./portal.repository.drizzle";
import type {
	TPortalBookingId,
	TPortalConfigId,
	TPortalServiceId,
} from "./portal.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const portalRepoLayer = Layer.provide(
	PortalRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, IPortalRepository>) =>
	Effect.runPromise(Effect.provide(effect, portalRepoLayer));

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

describe.skipIf(!hasDb)("portal repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const branchId = generateId<TBranchId>();
	const serviceId = generateId<TPortalServiceId>();
	const prefix = `__smoke_portal_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// FK: portal_config/portal_services/portal_bookings/portal_reviews.business_id → businesses.id (CASCADE)
		// FK: portal_bookings.branch_id → branches.id (no cascade from business → branch)
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
	}, 20000);

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// portal_* tables CASCADE on business_id, so deleting the business cleans
		// them up — but branches do not cascade from business, so they go first.
		await db.execute(sql`DELETE FROM branches WHERE id = ${branchId}::uuid`);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}::uuid`);
	}, 20000);

	it("upserts (updateConfig) and reads (getConfig) the portal config by tenantId", async () => {
		const configId = generateId<TPortalConfigId>();

		await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				yield* repo.updateConfig({
					id: configId,
					tenantId,
					slug: `${prefix}-slug`,
					isActive: true,
					bookingEnabled: true,
					loginEnabled: true,
					guestBooking: true,
					depositRequired: false,
					depositAmount: 50000,
					logoUrl: null,
				});
			}),
		);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getConfig(tenantId);
			}),
		);

		expect(found).not.toBeNull();
		if (!found) return;
		expect(found.id).toBe(configId);
		expect(found.tenantId).toBe(tenantId);
		expect(found.slug).toBe(`${prefix}-slug`);
		expect(found.isActive).toBe(true);
		expect(found.guestBooking).toBe(true);
		expect(found.depositRequired).toBe(false);
		expect(found.depositAmount).toBe(50000);

		// Look up by slug while still active — getConfigBySlug only matches
		// active configs, mirroring the public portal entrypoint.
		const bySlug = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getConfigBySlug(`${prefix}-slug`);
			}),
		);
		expect(bySlug?.id).toBe(configId);

		// Re-upsert (update path) flips flags and changes the slug.
		await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				yield* repo.updateConfig({
					...found,
					slug: `${prefix}-slug-renamed`,
					isActive: false,
					depositAmount: 75000,
				});
			}),
		);

		const updated = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getConfig(tenantId);
			}),
		);
		expect(updated?.slug).toBe(`${prefix}-slug-renamed`);
		expect(updated?.isActive).toBe(false);
		expect(updated?.depositAmount).toBe(75000);

		// After deactivation, getConfigBySlug must NOT find it — confirms the
		// isActive filter is doing its job.
		const deactivatedBySlug = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getConfigBySlug(`${prefix}-slug-renamed`);
			}),
		);
		expect(deactivatedBySlug).toBeNull();

		// Clean up so the next test isn't affected.
		const cleanupDb = await getDb();
		await cleanupDb.execute(
			sql`DELETE FROM portal_config WHERE id = ${configId}::uuid`,
		);
	}, 15000);

	it("creates (createService) and lists (getServices) active services for the tenant", async () => {
		const created = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.createService(tenantId, {
					tenantId,
					name: `${prefix} FullGroom`,
					description: "Integration test service",
					durationMinutes: 90,
					price: 120000,
					isActive: true,
					category: null,
				});
			}),
		);

		expect(created.id).toBeTruthy();
		expect(created.name).toBe(`${prefix} FullGroom`);
		expect(created.price).toBe(120000);
		expect(created.durationMinutes).toBe(90);
		expect(created.isActive).toBe(true);

		const list = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getServices(tenantId);
			}),
		);
		const found = list.find((s) => s.id === created.id);
		expect(found).toBeDefined();
		expect(found?.price).toBe(120000);

		// Soft-delete (is_active = false) and verify it disappears from the
		// active-only listing.
		await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				yield* repo.deleteService(tenantId, created.id);
			}),
		);

		const afterDelete = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getServices(tenantId);
			}),
		);
		expect(afterDelete.find((s) => s.id === created.id)).toBeUndefined();

		// Hard-clean the soft-deleted row so `getStats` totalServices is not
		// affected by other tests' artifacts.
		const cleanupDb = await getDb();
		await cleanupDb.execute(
			sql`DELETE FROM portal_services WHERE id = ${created.id}::uuid`,
		);
	}, 15000);

	it("saves (saveBooking) and lists (getBookings) bookings scoped to the tenant", async () => {
		const db = await getDb();
		// portal_bookings.service_id has an FK to portal_services; create a
		// throwaway service so the booking insert has a valid target.
		await db.insert(portalServices).values({
			id: serviceId,
			businessId: tenantId,
			name: `${prefix} Bath`,
			price: "50000",
			durationMinutes: 30,
			isActive: true,
		});

		const bookingId = generateId<TPortalBookingId>();
		const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

		await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				yield* repo.saveBooking({
					id: bookingId,
					tenantId,
					branchId,
					serviceId,
					customerName: "Integration Customer",
					customerPhone: "+6281200000001",
					customerEmail: "ic@example.com",
					petName: "Milo",
					petSpecies: "dog",
					petBreed: "poodle",
					scheduledAt,
					notes: "Integration booking",
					status: "pending",
					createdAt: new Date(),
				});
			}),
		);

		const list = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getBookings(tenantId);
			}),
		);

		const found = list.find((b) => b.id === bookingId);
		expect(found).toBeDefined();
		if (!found) return;
		expect(found.customerName).toBe("Integration Customer");
		expect(found.petName).toBe("Milo");
		expect(found.status).toBe("pending");
		expect(found.serviceId).toBe(serviceId);
		expect(found.scheduledAt.toISOString()).toBe(scheduledAt.toISOString());

		// updateBookingStatus should flip the status without touching other fields.
		await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				yield* repo.updateBookingStatus(tenantId, bookingId, "confirmed");
			}),
		);

		const confirmed = await run(
			Effect.gen(function* () {
				const repo = yield* IPortalRepository;
				return yield* repo.getBookings(tenantId);
			}),
		);
		expect(confirmed.find((b) => b.id === bookingId)?.status).toBe("confirmed");

		// Clean up booking + service + any reviews created by cascades/triggers.
		await db.execute(
			sql`DELETE FROM portal_bookings WHERE id = ${bookingId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM portal_reviews WHERE booking_id = ${bookingId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM portal_services WHERE id = ${serviceId}::uuid`,
		);
	}, 15000);
});
