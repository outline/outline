import { and, asc, eq, gte, lte } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { rooms, seasonalPricing } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { generateId, withRetry } from "@/shared/utils";
import { RoomNotFoundError, SeasonalPricingNotFoundError } from "./room.errors";
import { RoomRepository } from "./room.repository";
import type {
	TRoom,
	TRoomId,
	TRoomType,
	TSeasonalPricing,
	TSeasonalPricingId,
} from "./room.types";

type TRoomRow = typeof rooms.$inferSelect;
type TSeasonalPricingRow = typeof seasonalPricing.$inferSelect;

const mapRoomRow = (row: TRoomRow): TRoom => ({
	id: row.id as TRoomId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId as TBranchId | null,
	name: row.name,
	roomType: row.roomType as TRoomType,
	capacity: row.capacity,
	dailyRate: Number(row.dailyRate),
	description: row.description,
	isActive: row.isActive,
	sortOrder: row.sortOrder ?? 0,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapSeasonalPricingRow = (row: TSeasonalPricingRow): TSeasonalPricing => ({
	id: row.id as TSeasonalPricingId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	startDate: new Date(row.startDate),
	endDate: new Date(row.endDate),
	surchargePercent: row.surchargePercent ? Number(row.surchargePercent) : 0,
	surchargeFixed: row.surchargeFixed ? Number(row.surchargeFixed) : 0,
	isActive: row.isActive,
});

const toDateOnlyString = (d: Date): string => {
	const iso = d.toISOString();
	// Postgres `date` columns compare as a calendar date, not as a
	// timestamp — so we slice the ISO string to YYYY-MM-DD to avoid
	// timezone drift pushing a Dec-31 record into the next day.
	return iso.slice(0, 10);
};

export const RoomRepositoryDrizzle = Layer.effect(
	RoomRepository,
	Effect.map(IDrizzleClient, (db) =>
		RoomRepository.of({
			// ─── Rooms ──────────────────────────────────────────────────────

			getRooms: (tenantId: TTenantId, branchId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const conditions = [eq(rooms.businessId, tenantId)];
							// Mirror the live adapter's `branchId === "undefined"`
							// tolerance so a stale URL param doesn't kill the query.
							if (branchId && branchId !== "undefined") {
								conditions.push(eq(rooms.branchId, branchId));
							}
							const rows = await db.query.rooms.findMany({
								where: and(...conditions),
								orderBy: [asc(rooms.sortOrder)],
							});
							return rows.map(mapRoomRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getRoomById: (id: TRoomId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.rooms.findFirst({
								where: {
									RAW: (rooms, { and, eq }) =>
										and(eq(rooms.id, id), eq(rooms.businessId, tenantId)),
								},
							});
							if (!row) return null;
							return mapRoomRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				).pipe(
					Effect.flatMap((room) =>
						room
							? Effect.succeed(room)
							: Effect.fail(new RoomNotFoundError({ roomId: id })),
					),
				),

			saveRoom: (room: Omit<TRoom, "id" | "createdAt" | "updatedAt">) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [inserted] = await db
								.insert(rooms)
								.values({
									id: generateId(),
									businessId: room.tenantId,
									branchId: room.branchId,
									name: room.name,
									roomType: room.roomType,
									capacity: room.capacity,
									dailyRate: room.dailyRate.toString(),
									description: room.description,
									isActive: room.isActive,
									sortOrder: room.sortOrder,
								})
								.returning();
							if (!inserted) {
								throw new Error("rooms insert returned no row");
							}
							return mapRoomRow(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateRoom: (
				id: TRoomId,
				updates: Partial<Omit<TRoom, "id" | "createdAt" | "updatedAt">>,
				tenantId: TTenantId,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const patch: Partial<typeof rooms.$inferInsert> = {};
							if (updates.branchId !== undefined)
								patch.branchId = updates.branchId;
							if (updates.name !== undefined) patch.name = updates.name;
							if (updates.roomType !== undefined)
								patch.roomType = updates.roomType;
							if (updates.capacity !== undefined)
								patch.capacity = updates.capacity;
							if (updates.dailyRate !== undefined)
								patch.dailyRate = updates.dailyRate.toString();
							if (updates.description !== undefined)
								patch.description = updates.description;
							if (updates.isActive !== undefined)
								patch.isActive = updates.isActive;
							if (updates.sortOrder !== undefined)
								patch.sortOrder = updates.sortOrder;
							patch.updatedAt = new Date().toISOString();

							const [updated] = await db
								.update(rooms)
								.set(patch)
								.where(and(eq(rooms.id, id), eq(rooms.businessId, tenantId)))
								.returning();
							if (!updated) return null;
							return mapRoomRow(updated);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				).pipe(
					Effect.flatMap((room) =>
						room
							? Effect.succeed(room)
							: Effect.fail(new RoomNotFoundError({ roomId: id })),
					),
				),

			deleteRoom: (id: TRoomId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [deleted] = await db
								.delete(rooms)
								.where(and(eq(rooms.id, id), eq(rooms.businessId, tenantId)))
								.returning({ id: rooms.id });
							return Boolean(deleted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				).pipe(
					Effect.flatMap((deleted) =>
						deleted
							? Effect.succeed(undefined)
							: Effect.fail(new RoomNotFoundError({ roomId: id })),
					),
				),

			// ─── Seasonal Pricing ──────────────────────────────────────────

			getSeasonalPricings: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.seasonalPricing.findMany({
								where: eq(seasonalPricing.businessId, tenantId),
								orderBy: [asc(seasonalPricing.startDate)],
							});
							return rows.map(mapSeasonalPricingRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getActiveSeasonalPricing: (tenantId: TTenantId, targetDate: Date) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const target = toDateOnlyString(targetDate);
							const row = await db.query.seasonalPricing.findFirst({
								where: {
									RAW: (sp, { and, eq, lte, gte }) =>
									and(
										eq(sp.businessId, tenantId),
										eq(sp.isActive, true),
										lte(sp.startDate, target),
										gte(sp.endDate, target),
									),
								},
							});
							return row ? mapSeasonalPricingRow(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveSeasonalPricing: (pricing: Omit<TSeasonalPricing, "id">) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [inserted] = await db
								.insert(seasonalPricing)
								.values({
									id: generateId(),
									businessId: pricing.tenantId,
									name: pricing.name,
									startDate: toDateOnlyString(pricing.startDate),
									endDate: toDateOnlyString(pricing.endDate),
									surchargePercent: pricing.surchargePercent.toString(),
									surchargeFixed: pricing.surchargeFixed.toString(),
									isActive: pricing.isActive,
								})
								.returning();
							if (!inserted) {
								throw new Error("seasonal_pricing insert returned no row");
							}
							return mapSeasonalPricingRow(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateSeasonalPricing: (
				id: TSeasonalPricingId,
				updates: Partial<Omit<TSeasonalPricing, "id">>,
				tenantId: TTenantId,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const patch: Partial<typeof seasonalPricing.$inferInsert> = {};
							if (updates.name !== undefined) patch.name = updates.name;
							if (updates.startDate !== undefined)
								patch.startDate = toDateOnlyString(updates.startDate);
							if (updates.endDate !== undefined)
								patch.endDate = toDateOnlyString(updates.endDate);
							if (updates.surchargePercent !== undefined)
								patch.surchargePercent = updates.surchargePercent.toString();
							if (updates.surchargeFixed !== undefined)
								patch.surchargeFixed = updates.surchargeFixed.toString();
							if (updates.isActive !== undefined)
								patch.isActive = updates.isActive;

							const [updated] = await db
								.update(seasonalPricing)
								.set(patch)
								.where(
									and(
										eq(seasonalPricing.id, id),
										eq(seasonalPricing.businessId, tenantId),
									),
								)
								.returning();
							if (!updated) return null;
							return mapSeasonalPricingRow(updated);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				).pipe(
					Effect.flatMap((pricing) =>
						pricing
							? Effect.succeed(pricing)
							: Effect.fail(
									new SeasonalPricingNotFoundError({ pricingId: id }),
								),
					),
				),

			deleteSeasonalPricing: (id: TSeasonalPricingId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [deleted] = await db
								.delete(seasonalPricing)
								.where(
									and(
										eq(seasonalPricing.id, id),
										eq(seasonalPricing.businessId, tenantId),
									),
								)
								.returning({ id: seasonalPricing.id });
							return Boolean(deleted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				).pipe(
					Effect.flatMap((deleted) =>
						deleted
							? Effect.succeed(undefined)
							: Effect.fail(
									new SeasonalPricingNotFoundError({ pricingId: id }),
								),
					),
				),
		}),
	),
);
