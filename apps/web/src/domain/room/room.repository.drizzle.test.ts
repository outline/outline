// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import { branches, businesses } from "@/infra/db/drizzle/schema";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { type IRoomRepository, RoomRepository } from "./room.repository";
import { RoomRepositoryDrizzle } from "./room.repository.drizzle";
import type { TRoomId, TRoomType, TSeasonalPricingId } from "./room.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const roomRepoLayer = Layer.provide(RoomRepositoryDrizzle, DrizzleClientLive);

const run = <A, E>(effect: Effect.Effect<A, E, IRoomRepository>) =>
	Effect.runPromise(Effect.provide(effect, roomRepoLayer));

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

const toDateOnlyString = (d: Date): string => d.toISOString().slice(0, 10);

describe.skipIf(!hasDb)("room repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const branchId = generateId<TBranchId>();
	const prefix = `__smoke_room_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// FK constraints: rooms.business_id → businesses.id, rooms.branch_id → branches.id
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
		// CASCADE: seasonal_pricing.business_id ON DELETE CASCADE, but rooms has no cascade on business
		// so delete rooms/seasonal_pricing first, then branches, then business.
		await db.execute(
			sql`DELETE FROM seasonal_pricing WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM rooms WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(sql`DELETE FROM branches WHERE id = ${branchId}::uuid`);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}::uuid`);
	}, 20000);

	it("creates (saveRoom) and reads a room by id", async () => {
		const created = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.saveRoom({
					tenantId,
					branchId,
					name: `${prefix} Suite`,
					roomType: "deluxe" as TRoomType,
					capacity: 2,
					dailyRate: 150000,
					description: "Integration test room",
					isActive: true,
					sortOrder: 1,
				});
			}),
		);

		expect(created.id).toBeTruthy();
		expect(created.name).toBe(`${prefix} Suite`);
		expect(created.roomType).toBe("deluxe");
		expect(created.dailyRate).toBe(150000);

		const found = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.getRoomById(created.id, tenantId);
			}),
		);

		expect(found.id).toBe(created.id);
		expect(found.name).toBe(`${prefix} Suite`);
		expect(found.capacity).toBe(2);
		expect(found.branchId).toBe(branchId);
	}, 15000);

	it("findAll (getRooms) lists rooms for the tenant, scoped by branchId", async () => {
		const otherBranchId = generateId<TBranchId>();
		const db = await getDb();
		await db.insert(branches).values({
			id: otherBranchId,
			businessId: tenantId,
			name: `${prefix}_branch_other`,
		});
		try {
			const created = await run(
				Effect.gen(function* () {
					const repo = yield* RoomRepository;
					return yield* repo.saveRoom({
						tenantId,
						branchId: otherBranchId,
						name: `${prefix} Other`,
						roomType: "standard" as TRoomType,
						capacity: 1,
						dailyRate: 50000,
						description: null,
						isActive: true,
						sortOrder: 0,
					});
				}),
			);

			const allInBranch = await run(
				Effect.gen(function* () {
					const repo = yield* RoomRepository;
					return yield* repo.getRooms(tenantId, branchId);
				}),
			);
			expect(allInBranch.find((r) => r.id === created.id)).toBeUndefined();

			const allInOther = await run(
				Effect.gen(function* () {
					const repo = yield* RoomRepository;
					return yield* repo.getRooms(tenantId, otherBranchId);
				}),
			);
			expect(allInOther.find((r) => r.id === created.id)).toBeDefined();
		} finally {
			await db.execute(
				sql`DELETE FROM rooms WHERE branch_id = ${otherBranchId}::uuid`,
			);
			await db.execute(
				sql`DELETE FROM branches WHERE id = ${otherBranchId}::uuid`,
			);
		}
	}, 15000);

	it("findAvailable (getActiveSeasonalPricing) returns the pricing matching the target date", async () => {
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dayAfter = new Date(today);
		dayAfter.setDate(dayAfter.getDate() + 7);

		const created = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.saveSeasonalPricing({
					tenantId,
					name: `${prefix} HighSeason`,
					startDate: tomorrow,
					endDate: dayAfter,
					surchargePercent: 25,
					surchargeFixed: 10000,
					isActive: true,
				});
			}),
		);

		const targetDate = new Date(today);
		targetDate.setDate(targetDate.getDate() + 3);

		const active = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.getActiveSeasonalPricing(tenantId, targetDate);
			}),
		);

		expect(active?.id).toBe(created.id);
		expect(active?.name).toBe(`${prefix} HighSeason`);
		expect(active?.surchargePercent).toBe(25);
	}, 15000);

	it("updates a room", async () => {
		const created = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.saveRoom({
					tenantId,
					branchId,
					name: `${prefix} Updatable`,
					roomType: "standard" as TRoomType,
					capacity: 1,
					dailyRate: 75000,
					description: null,
					isActive: true,
					sortOrder: 0,
				});
			}),
		);

		const updated = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.updateRoom(
					created.id,
					{
						name: `${prefix} Renamed`,
						dailyRate: 99999,
					},
					tenantId,
				);
			}),
		);

		expect(updated.name).toBe(`${prefix} Renamed`);
		expect(updated.dailyRate).toBe(99999);
	}, 15000);

	it("returns RoomNotFoundError when fetching an unknown id", async () => {
		const missing = generateId<TRoomId>();
		const exit = await Effect.runPromiseExit(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* RoomRepository;
					return yield* repo.getRoomById(missing, tenantId);
				}),
				roomRepoLayer,
			),
		);
		expect(exit._tag).toBe("Failure");
		if (exit._tag === "Failure") {
			const failure = JSON.stringify(exit.cause);
			expect(failure).toContain("RoomNotFoundError");
		}
	}, 15000);

	it("deletes a room", async () => {
		const created = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.saveRoom({
					tenantId,
					branchId,
					name: `${prefix} Deletable`,
					roomType: "vip" as TRoomType,
					capacity: 4,
					dailyRate: 500000,
					description: null,
					isActive: true,
					sortOrder: 99,
				});
			}),
		);

		await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				yield* repo.deleteRoom(created.id, tenantId);
			}),
		);

		const exit = await Effect.runPromiseExit(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* RoomRepository;
					return yield* repo.getRoomById(created.id, tenantId);
				}),
				roomRepoLayer,
			),
		);
		expect(exit._tag).toBe("Failure");
	}, 15000);

	it("returns SeasonalPricingNotFoundError when deleting a missing pricing", async () => {
		const missing = generateId<TSeasonalPricingId>();
		const exit = await Effect.runPromiseExit(
			Effect.provide(
				Effect.gen(function* () {
					const repo = yield* RoomRepository;
					yield* repo.deleteSeasonalPricing(missing, tenantId);
				}),
				roomRepoLayer,
			),
		);
		expect(exit._tag).toBe("Failure");
		if (exit._tag === "Failure") {
			const failure = JSON.stringify(exit.cause);
			expect(failure).toContain("SeasonalPricingNotFoundError");
		}
	}, 15000);

	it("date-only columns round-trip as YYYY-MM-DD", async () => {
		const start = new Date("2026-12-20T00:00:00.000Z");
		const end = new Date("2026-12-31T00:00:00.000Z");
		const created = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.saveSeasonalPricing({
					tenantId,
					name: `${prefix} NY`,
					startDate: start,
					endDate: end,
					surchargePercent: 50,
					surchargeFixed: 0,
					isActive: true,
				});
			}),
		);

		const list = await run(
			Effect.gen(function* () {
				const repo = yield* RoomRepository;
				return yield* repo.getSeasonalPricings(tenantId);
			}),
		);
		const found = list.find((p) => p.id === created.id);
		expect(found).toBeDefined();
		if (!found) return;
		expect(toDateOnlyString(found.startDate)).toBe("2026-12-20");
		expect(toDateOnlyString(found.endDate)).toBe("2026-12-31");
	}, 15000);
});
