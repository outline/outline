import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { boardings } from "@/infra/db/drizzle/schema";
import type {
	branches,
	businesses,
	products,
	rooms,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { withRetry } from "@/shared/utils";
import { IPublicRepository } from "./public.repository";
import type {
	TPublicBranch,
	TPublicBusiness,
	TPublicProduct,
	TPublicRoom,
} from "./public.types";

type TBranchesRow = typeof branches.$inferSelect;
type TRoomsRow = typeof rooms.$inferSelect;
type TProductsRow = typeof products.$inferSelect;

const mapBusiness = (
	row: Pick<
		typeof businesses.$inferSelect,
		"id" | "name" | "slug" | "logoUrl" | "address" | "phone"
	>,
): TPublicBusiness => ({
	id: row.id,
	name: row.name,
	slug: row.slug,
	logoUrl: row.logoUrl,
	address: row.address,
	phone: row.phone,
});

const mapBranch = (row: TBranchesRow): TPublicBranch => ({
	id: row.id,
	businessId: row.businessId,
	name: row.name,
	address: row.address,
	phone: row.phone,
	capacity: row.capacity,
	isActive: row.isActive,
});

const mapRoom = (row: TRoomsRow): TPublicRoom => ({
	id: row.id,
	businessId: row.businessId,
	branchId: row.branchId,
	name: row.name,
	description: row.description,
	roomType: row.roomType,
	capacity: row.capacity,
	dailyRate: Number(row.dailyRate),
	isActive: row.isActive,
	occupied: 0,
	available: row.capacity,
});

const mapProduct = (row: TProductsRow): TPublicProduct => ({
	id: row.id,
	businessId: row.businessId,
	name: row.name,
	description: row.description,
	price: Number(row.price),
	imageUrl: row.imageUrl,
	category: row.category,
	isActive: row.isActive,
	sku: row.sku,
	stock: row.stock,
	unit: row.unit,
});

export const PublicRepositoryDrizzle = Layer.effect(
	IPublicRepository,
	Effect.map(IDrizzleClient, (db) =>
		IPublicRepository.of({
			getBusinessBySlug: (slug: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.businesses.findFirst({
								where: { RAW: (businesses, { eq }) => eq(businesses.slug, slug) },
								columns: {
									id: true,
									name: true,
									slug: true,
									logoUrl: true,
									address: true,
									phone: true,
								},
							});
							return row ? mapBusiness(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getBranches: (businessId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.branches.findMany({
								where: {
									RAW: (branches, { eq }) => eq(branches.businessId, businessId),
								},
							});
							return rows.map(mapBranch);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getRooms: (businessId: string, targetDate = new Date()) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.rooms.findMany({
								where: {
									RAW: (rooms, { and, eq }) =>
									and(
										eq(rooms.businessId, businessId),
										eq(rooms.isActive, true),
									) ?? sql``,
								},
							});
							const boardingRows = await db
								.select({
									roomId: boardings.roomId,
									checkInDate: boardings.checkInDate,
									estimatedCheckOutDate: boardings.estimatedCheckOutDate,
								})
								.from(boardings)
								.where(
									and(
										eq(boardings.businessId, businessId),
										inArray(boardings.status, ["active", "draft"]),
									),
								);
							const target = targetDate.toISOString().slice(0, 10);
							const occupiedByRoom = new Map<string, number>();
							for (const boarding of boardingRows) {
								if (
									!boarding.roomId ||
									boarding.checkInDate > target ||
									(boarding.estimatedCheckOutDate !== null &&
										boarding.estimatedCheckOutDate <= target)
								) {
									continue;
								}
								occupiedByRoom.set(
									boarding.roomId,
									(occupiedByRoom.get(boarding.roomId) ?? 0) + 1,
								);
							}
							return rows.map((row) => {
								const room = mapRoom(row);
								const occupied = occupiedByRoom.get(room.id) ?? 0;
								return {
									...room,
									occupied,
									available: Math.max(0, room.capacity - occupied),
								};
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getProduct: (businessId: string, productId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.products.findFirst({
								where: {
									RAW: (products, { and, eq }) =>
									and(
										eq(products.id, productId),
										eq(products.businessId, businessId),
									) ?? sql``,
								},
							});
							return row ? mapProduct(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getFeaturedProducts: (businessId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.products.findMany({
								where: {
									RAW: (products, { and, eq }) =>
									and(
										eq(products.businessId, businessId),
										eq(products.isActive, true),
										eq(products.isFeatured, true),
									) ?? sql``,
								},
							});
							return rows.map(mapProduct);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
