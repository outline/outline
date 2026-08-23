// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TPetId } from "@/domain/pet/pet.types";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	GroomingRepository,
	type IGroomingRepository,
} from "./grooming.repository";
import { GroomingRepositoryDrizzle } from "./grooming.repository.drizzle";
import type {
	TGroomingAddonId,
	TGroomingAppointmentId,
	TGroomingServiceId,
} from "./grooming.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const groomingRepoLayer = Layer.provide(
	GroomingRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(
	effect: Effect.Effect<A, E, IGroomingRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, groomingRepoLayer));

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

describe.skipIf(!hasDb)("grooming repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const prefix = `__smoke_grooming_${Date.now()}`;

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
		// Delete appointments first so the FK cascade clears
		// grooming_appointment_addons + grooming_photos. Then the
		// businesses cascade can delete grooming_addons safely
		// (otherwise the addon_id FK from appointment_addons would
		// block the addon cascade).
		await db.execute(
			sql`DELETE FROM grooming_appointments WHERE business_id = ${tenantId}`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}`);
	});

	const seedService = async (
		db: DrizzleClient,
		nameSuffix: string,
	): Promise<TGroomingServiceId> => {
		const serviceId = generateId<TGroomingServiceId>();
		await db.execute(
			sql`INSERT INTO grooming_services (id, business_id, name, duration_minutes, price_small, price_medium, price_large, price_xl, is_active, sort_order) VALUES (${serviceId}, ${tenantId}, ${`${prefix} ${nameSuffix}`}, 60, 50000, 75000, 100000, 125000, true, 0)`,
		);
		return serviceId;
	};

	const seedAddon = async (
		db: DrizzleClient,
		nameSuffix: string,
		price = 25000,
	): Promise<TGroomingAddonId> => {
		const addonId = generateId<TGroomingAddonId>();
		await db.execute(
			sql`INSERT INTO grooming_addons (id, business_id, name, price, is_active) VALUES (${addonId}, ${tenantId}, ${`${prefix} ${nameSuffix}`}, ${price}, true)`,
		);
		return addonId;
	};

	const seedPet = async (db: DrizzleClient): Promise<TPetId> => {
		const petId = generateId<TPetId>();
		await db.execute(
			sql`INSERT INTO pets (id, business_id, name, species) VALUES (${petId}, ${tenantId}, ${`${prefix} Pet`}, 'dog')`,
		);
		return petId;
	};

	const seedCustomer = async (db: DrizzleClient): Promise<TCustomerId> => {
		const customerId = generateId<TCustomerId>();
		await db.execute(
			sql`INSERT INTO customers (id, business_id, full_name, phone) VALUES (${customerId}, ${tenantId}, ${`${prefix} Customer`}, ${`${prefix}-phone-${customerId.slice(0, 6)}`})`,
		);
		return customerId;
	};

	const seedBranch = async (db: DrizzleClient): Promise<TBranchId> => {
		const branchId = generateId<TBranchId>();
		await db.execute(
			sql`INSERT INTO branches (id, business_id, name, is_active) VALUES (${branchId}, ${tenantId}, ${`${prefix} Branch`}, true)`,
		);
		return branchId;
	};

	it("creates, finds, and deletes a grooming service (scoped to tenant)", async () => {
		const db = await getDb();
		const serviceId = await seedService(db, "Create");

		const created = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) => repo.getServiceById(serviceId, tenantId)),
			),
		);

		expect(created.id).toBe(serviceId);
		expect(created.tenantId).toBe(tenantId);
		expect(created.name).toBe(`${prefix} Create`);
		expect(created.priceSmall).toBe(50000);
		expect(created.priceMedium).toBe(75000);
		expect(created.durationMinutes).toBe(60);
		expect(created.isActive).toBe(true);

		// Cross-tenant lookup returns NotFound
		const otherTenant = generateId<TTenantId>();
		await expect(
			run(
				Effect.gen(function* () {
					const repo = yield* GroomingRepository;
					return yield* repo
						.getServiceById(serviceId, otherTenant)
						.pipe(Effect.flip);
				}),
			),
		).resolves.toMatchObject({ _tag: "GroomingServiceNotFoundError" });

		// updateService mutates fields and is tenant-scoped
		const updated = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.updateService(
						serviceId,
						{ name: `${prefix} Updated`, priceMedium: 80000 },
						tenantId,
					),
				),
			),
		);
		expect(updated.name).toBe(`${prefix} Updated`);
		expect(updated.priceMedium).toBe(80000);

		// deleteService works, second call surfaces NotFound
		await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) => repo.deleteService(serviceId, tenantId)),
			),
		);
		await expect(
			run(
				Effect.gen(function* () {
					const repo = yield* GroomingRepository;
					return yield* repo
						.getServiceById(serviceId, tenantId)
						.pipe(Effect.flip);
				}),
			),
		).resolves.toMatchObject({ _tag: "GroomingServiceNotFoundError" });
	}, 20000);

	it("lists services ordered by sort_order", async () => {
		const db = await getDb();
		const a = generateId<TGroomingServiceId>();
		const b = generateId<TGroomingServiceId>();
		const c = generateId<TGroomingServiceId>();
		await db.execute(
			sql`INSERT INTO grooming_services (id, business_id, name, sort_order) VALUES (${a}, ${tenantId}, ${`${prefix} ListA`}, 1), (${b}, ${tenantId}, ${`${prefix} ListB`}, 0), (${c}, ${tenantId}, ${`${prefix} ListC`}, 2)`,
		);

		const list = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) => repo.getServices(tenantId)),
			),
		);
		const namesInOrder = list
			.filter((s) => s.name.startsWith(`${prefix} List`))
			.map((s) => s.name);
		expect(namesInOrder).toEqual([
			`${prefix} ListB`,
			`${prefix} ListA`,
			`${prefix} ListC`,
		]);
	}, 15000);

	it("finds addons by id, scoped to tenant", async () => {
		const db = await getDb();
		const addonId = await seedAddon(db, "Addon1", 15000);

		const found = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) => repo.getAddonById(addonId, tenantId)),
			),
		);
		expect(found.id).toBe(addonId);
		expect(found.price).toBe(15000);
		expect(found.tenantId).toBe(tenantId);
	}, 15000);

	it("books an appointment via the atomic RPC port and persists addons", async () => {
		const db = await getDb();
		const serviceId = await seedService(db, "BookBase");
		const addonA = await seedAddon(db, "BookAddonA", 10000);
		const addonB = await seedAddon(db, "BookAddonB", 20000);
		const petId = await seedPet(db);
		const customerId = await seedCustomer(db);
		const branchId = await seedBranch(db);
		const scheduledAt = new Date("2027-03-15T09:00:00Z");

		const appointmentId = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) =>
					repo
						.bookAppointment(
							{
								tenantId,
								branchId,
								serviceId,
								petId,
								customerId,
								groomerId: null,
								petSize: "medium",
								price: 75000,
								status: "pending",
								scheduledAt,
								startedAt: null,
								completedAt: null,
								notes: `${prefix} Initial appointment`,
								cancellationReason: null,
								createdBy: null,
							},
							[
								{ addonId: addonA, price: 10000 },
								{ addonId: addonB, price: 20000 },
							],
						)
						.pipe(Effect.map((a) => a.id)),
				),
			),
		);

		// appointment row exists with all expected fields
		const appointmentRow = await db.execute<{
			price: string;
			status: string;
			notes: string;
			scheduled_at: string;
			tenant_id_lit: string;
		}>(
			sql`SELECT price, status, notes, scheduled_at, business_id AS tenant_id_lit FROM grooming_appointments WHERE id = ${appointmentId}`,
		);
		expect(appointmentRow.rows[0]?.price).toBe("75000");
		expect(appointmentRow.rows[0]?.status).toBe("pending");
		expect(appointmentRow.rows[0]?.notes).toBe(`${prefix} Initial appointment`);
		expect(appointmentRow.rows[0]?.tenant_id_lit).toBe(tenantId);

		// two appointment_addons rows were inserted atomically
		const addons = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) => repo.getAppointmentAddons(appointmentId)),
			),
		);
		expect(addons).toHaveLength(2);
		const addonIds = addons.map((a) => a.addonId).sort();
		expect(addonIds).toEqual([addonA, addonB].sort());
		const totalAddonPrice = addons.reduce((acc, a) => acc + a.price, 0);
		expect(totalAddonPrice).toBe(30000);
	}, 20000);

	it("rolls back the appointment + addons when a child insert fails (atomic)", async () => {
		const db = await getDb();
		const serviceId = await seedService(db, "RollbackSvc");
		const petId = await seedPet(db);
		const customerId = await seedCustomer(db);
		const scheduledAt = new Date("2027-03-16T09:00:00Z");

		// Use a non-existent addon id so the second insert inside the
		// transaction fails the FK constraint. The drizzle transaction
		// should roll back so no appointment row is persisted.
		const bogusAddonId = generateId<TGroomingAddonId>();

		await expect(
			run(
				GroomingRepository.pipe(
					Effect.flatMap((repo) =>
						repo.bookAppointment(
							{
								tenantId,
								branchId: null,
								serviceId,
								petId,
								customerId,
								groomerId: null,
								petSize: "small",
								price: 50000,
								status: "pending",
								scheduledAt,
								startedAt: null,
								completedAt: null,
								notes: `${prefix} ShouldRollBack`,
								cancellationReason: null,
								createdBy: null,
							},
							[{ addonId: bogusAddonId, price: 999 }],
						),
					),
				),
			),
		).rejects.toBeDefined();

		// No appointment row was persisted — the transaction rolled back.
		const rows = await db.execute(
			sql`SELECT id FROM grooming_appointments WHERE notes = ${`${prefix} ShouldRollBack`}`,
		);
		expect(rows.rows).toHaveLength(0);
	}, 20000);

	it("lists appointments in a date range, scoped to tenant", async () => {
		const db = await getDb();
		const serviceId = await seedService(db, "RangeSvc");
		const petId = await seedPet(db);
		const inRange = generateId<TGroomingAppointmentId>();
		const outOfRange = generateId<TGroomingAppointmentId>();

		const scheduledIn = new Date("2027-04-10T08:00:00Z");
		const scheduledOut = new Date("2027-04-01T08:00:00Z");

		await db.execute(
			sql`INSERT INTO grooming_appointments (id, business_id, service_id, pet_id, pet_size, price, status, scheduled_at) VALUES (${inRange}, ${tenantId}, ${serviceId}, ${petId}, 'small', 50000, 'pending', ${scheduledIn.toISOString()}), (${outOfRange}, ${tenantId}, ${serviceId}, ${petId}, 'small', 50000, 'pending', ${scheduledOut.toISOString()})`,
		);

		const list = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.getAppointments(tenantId, {
						start: new Date("2027-04-05T00:00:00Z"),
						end: new Date("2027-04-15T00:00:00Z"),
					}),
				),
			),
		);

		const ids = list.map((a) => a.id);
		expect(ids).toContain(inRange);
		expect(ids).not.toContain(outOfRange);
	}, 15000);

	it("saves and reads grooming photos", async () => {
		const db = await getDb();
		const serviceId = await seedService(db, "PhotoSvc");
		const petId = await seedPet(db);
		const scheduledAt = new Date("2027-05-01T09:00:00Z");
		const appointmentId = generateId<TGroomingAppointmentId>();
		await db.execute(
			sql`INSERT INTO grooming_appointments (id, business_id, service_id, pet_id, pet_size, price, status, scheduled_at) VALUES (${appointmentId}, ${tenantId}, ${serviceId}, ${petId}, 'medium', 50000, 'completed', ${scheduledAt.toISOString()})`,
		);

		void generateId; // silence unused import linter
		await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.savePhoto({
						appointmentId,
						photoUrl: "https://example.com/before.jpg",
						photoType: "before",
					}),
				),
			),
		);

		const photos = await run(
			GroomingRepository.pipe(
				Effect.flatMap((repo) => repo.getPhotos(appointmentId)),
			),
		);
		expect(photos).toHaveLength(1);
		expect(photos[0]?.photoType).toBe("before");
		expect(photos[0]?.photoUrl).toBe("https://example.com/before.jpg");
	}, 15000);
});
