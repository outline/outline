import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	portalBookings,
	portalConfig,
	portalReviews,
	portalServices,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId, withRetry } from "@/shared/utils";
import { PortalError } from "./portal.errors";
import { IPortalRepository } from "./portal.repository";
import type {
	TPortalBooking,
	TPortalBookingId,
	TPortalConfig,
	TPortalConfigId,
	TPortalReview,
	TPortalReviewId,
	TPortalService,
	TPortalServiceId,
	TPortalStats,
} from "./portal.types";

type TConfigRow = typeof portalConfig.$inferSelect;
type TServiceRow = typeof portalServices.$inferSelect;
type TBookingRow = typeof portalBookings.$inferSelect;
type TReviewRow = typeof portalReviews.$inferSelect;

const mapConfigRow = (row: TConfigRow): TPortalConfig => ({
	id: row.id as TPortalConfigId,
	tenantId: row.businessId as TTenantId,
	slug: row.slug,
	isActive: row.isActive ?? false,
	bookingEnabled: row.bookingEnabled ?? true,
	loginEnabled: row.loginEnabled ?? true,
	guestBooking: row.guestBooking ?? false,
	depositRequired: row.depositRequired ?? true,
	depositAmount: Number(row.depositAmount ?? 0),
	logoUrl: row.logoUrl ?? null,
});

const mapServiceRow = (row: TServiceRow): TPortalService => ({
	id: row.id as TPortalServiceId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	description: row.description,
	durationMinutes: row.durationMinutes ?? 0,
	price: Number(row.price),
	isActive: row.isActive ?? false,
	category: row.category as TPortalService["category"],
});

const mapBookingRow = (row: TBookingRow): TPortalBooking => ({
	id: row.id as TPortalBookingId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId,
	serviceId: row.serviceId as TPortalServiceId | null,
	customerName: row.customerName,
	customerPhone: row.customerPhone,
	customerEmail: row.customerEmail,
	petName: row.petName,
	petSpecies: row.petSpecies,
	petBreed: row.petBreed,
	scheduledAt: new Date(row.scheduledAt),
	notes: row.notes,
	status: row.status as TPortalBooking["status"],
	createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
});

const mapReviewRow = (row: TReviewRow): TPortalReview => ({
	id: row.id as TPortalReviewId,
	customerName: row.customerName ?? "",
	rating: row.rating,
	content: row.comment ?? "",
	createdAt: row.createdAt ?? "",
});

export const PortalRepositoryDrizzle = Layer.effect(
	IPortalRepository,
	Effect.map(IDrizzleClient, (db) =>
		IPortalRepository.of({
			getConfig: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.portalConfig.findFirst({
								where: { RAW: () => eq(portalConfig.businessId, tenantId) },
							});
							return row ? mapConfigRow(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getConfigBySlug: (slug: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.portalConfig.findFirst({
								where: {
									RAW: () =>
										and(
											eq(portalConfig.slug, slug),
											eq(portalConfig.isActive, true),
										) ?? sql``,
								},
							});
							return row ? mapConfigRow(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getServices: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.portalServices.findMany({
								where: {
									RAW: () =>
										and(
											eq(portalServices.businessId, tenantId),
											eq(portalServices.isActive, true),
										) ?? sql``,
								},
								orderBy: (services, { asc }) => asc(services.name),
							});
							return rows.map(mapServiceRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateConfig: (config: TPortalConfig) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.insert(portalConfig)
								.values({
									id: config.id,
									businessId: config.tenantId,
									slug: config.slug,
									isActive: config.isActive,
									bookingEnabled: config.bookingEnabled,
									loginEnabled: config.loginEnabled,
									guestBooking: config.guestBooking,
									depositRequired: config.depositRequired,
									depositAmount: config.depositAmount.toString(),
									logoUrl: config.logoUrl,
									updatedAt: new Date().toISOString(),
								})
								.onConflictDoUpdate({
									target: portalConfig.id,
									set: {
										slug: config.slug,
										isActive: config.isActive,
										bookingEnabled: config.bookingEnabled,
										loginEnabled: config.loginEnabled,
										guestBooking: config.guestBooking,
										depositRequired: config.depositRequired,
										depositAmount: config.depositAmount.toString(),
										logoUrl: config.logoUrl,
										updatedAt: new Date().toISOString(),
									},
								});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveBooking: (booking: TPortalBooking) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(portalBookings).values({
								id: booking.id,
								businessId: booking.tenantId,
								// `portal_bookings.branch_id` is NOT NULL in the schema;
								// the live adapter falls back to the tenant id
								// when no branch is provided — mirror that here so the
								// public booking form (no branch context) still inserts.
								branchId: booking.branchId ?? booking.tenantId,
								serviceId: booking.serviceId,
								customerName: booking.customerName,
								customerPhone: booking.customerPhone,
								customerEmail: booking.customerEmail,
								petName: booking.petName,
								petSpecies: booking.petSpecies,
								petBreed: booking.petBreed,
								scheduledAt: booking.scheduledAt.toISOString(),
								notes: booking.notes,
								status: booking.status,
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			createService: (
				tenantId: TTenantId,
				service: Omit<TPortalService, "id">,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [inserted] = await db
								.insert(portalServices)
								.values({
									id: generateId(),
									businessId: tenantId,
									name: service.name,
									description: service.description,
									price: service.price.toString(),
									durationMinutes: service.durationMinutes,
									category: service.category,
									isActive: true,
								})
								.returning();
							if (!inserted) {
								throw new Error("portal_services insert returned no row");
							}
							return mapServiceRow(inserted);
						},
						catch: (e) => {
							if (e instanceof DatabaseError) return e;
							return new PortalError({ message: (e as Error).message });
						},
					}),
				),

			deleteService: (tenantId: TTenantId, serviceId: TPortalServiceId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [updated] = await db
								.update(portalServices)
								.set({ isActive: false, updatedAt: new Date().toISOString() })
								.where(
									and(
										eq(portalServices.id, serviceId),
										eq(portalServices.businessId, tenantId),
									),
								)
								.returning({ id: portalServices.id });
							if (!updated) {
								throw new PortalError({
									message: `portal service ${serviceId} not found for tenant ${tenantId}`,
								});
							}
						},
						catch: (e) => {
							if (e instanceof DatabaseError) return e;
							return new PortalError({ message: (e as Error).message });
						},
					}),
				),

			getBookings: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.portalBookings.findMany({
								where: { RAW: () => eq(portalBookings.businessId, tenantId) },
								orderBy: (bookings, { desc }) => desc(bookings.createdAt),
							});
							return rows.map(mapBookingRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateBookingStatus: (
				tenantId: TTenantId,
				bookingId: string,
				status: TPortalBooking["status"],
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(portalBookings)
								.set({ status, updatedAt: new Date().toISOString() })
								.where(
									and(
										eq(portalBookings.id, bookingId),
										eq(portalBookings.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getReviews: (tenantId: TTenantId, options) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const limit = options?.limit ?? 10;
							const rows = await db.query.portalReviews.findMany({
								where: { RAW: () => eq(portalReviews.businessId, tenantId) },
								orderBy: (reviews, { desc }) => desc(reviews.createdAt),
								limit,
							});
							return rows.map(mapReviewRow);
						},
						catch: (e) => {
							if (e instanceof DatabaseError) return e;
							return new PortalError({ message: (e as Error).message });
						},
					}),
				),

			getStats: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// `portal_stats` exists as a database view but is not a
							// `pgTable` in the Drizzle schema, so compute the same
							// shape from the underlying portal_* tables.
							const reviews = await db.query.portalReviews.findMany({
								where: { RAW: () => eq(portalReviews.businessId, tenantId) },
								columns: { rating: true },
							});
							const totalReviews = reviews.length;
							const averageRating =
								totalReviews === 0
									? 0
									: reviews.reduce((sum, r) => sum + r.rating, 0) /
										totalReviews;
							const services = await db.query.portalServices.findMany({
								where: {
									RAW: () =>
										and(
											eq(portalServices.businessId, tenantId),
											eq(portalServices.isActive, true),
										) ?? sql``,
								},
								columns: { id: true },
							});
							const totalServices = services.length;
							// `totalPets` mirrors the legacy view by counting distinct
							// pet names on bookings the tenant has received.
							const bookings = await db.query.portalBookings.findMany({
								where: { RAW: () => eq(portalBookings.businessId, tenantId) },
								columns: { petName: true },
							});
							const totalPets = new Set(bookings.map((b) => b.petName)).size;
							const stats: TPortalStats = {
								totalReviews,
								averageRating,
								totalServices,
								totalPets,
							};
							return stats;
						},
						catch: (e) => {
							if (e instanceof DatabaseError) return e;
							return new PortalError({ message: (e as Error).message });
						},
					}),
				),
		}),
	),
);
