import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
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
	row: Pick<typeof businesses.$inferSelect, "id" | "name" | "slug" | "logoUrl">,
): TPublicBusiness => ({
	id: row.id,
	name: row.name,
	slug: row.slug,
	logoUrl: row.logoUrl,
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
								where: (businesses, { eq }) => eq(businesses.slug, slug),
								columns: {
									id: true,
									name: true,
									slug: true,
									logoUrl: true,
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
								where: (branches, { eq }) =>
									eq(branches.businessId, businessId),
							});
							return rows.map(mapBranch);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getRooms: (businessId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.rooms.findMany({
								where: (rooms, { and, eq }) =>
									and(
										eq(rooms.businessId, businessId),
										eq(rooms.isActive, true),
									),
							});
							return rows.map(mapRoom);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getProduct: (businessId: string, productId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.products.findFirst({
								where: (products, { and, eq }) =>
									and(
										eq(products.id, productId),
										eq(products.businessId, businessId),
									),
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
								where: (products, { and, eq }) =>
									and(
										eq(products.businessId, businessId),
										eq(products.isActive, true),
										eq(products.isFeatured, true),
									),
							});
							return rows.map(mapProduct);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
