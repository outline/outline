import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	boardingPets,
	boardings,
	branches,
	customers,
	pets,
	portalBookings,
	portalConfig,
	portalReviews,
	portalServices,
	rooms,
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

const toDateOnlyString = (date: Date): string =>
	date.toISOString().slice(0, 10);

const toPetKind = (
	species: string | null,
): "cat" | "dog" | "rabbit" | "other" => {
	if (species === "cat" || species === "dog" || species === "rabbit") {
		return species;
	}
	return "other";
};

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
	roomId: row.roomId,
	boardingId: row.boardingId,
	idempotencyKey: row.idempotencyKey,
	customerName: row.customerName,
	customerPhone: row.customerPhone,
	customerEmail: row.customerEmail,
	petName: row.petName,
	petSpecies: row.petSpecies,
	petBreed: row.petBreed,
	scheduledAt: new Date(row.scheduledAt),
	estimatedCheckOutAt: row.estimatedCheckOutAt
		? new Date(row.estimatedCheckOutAt)
		: null,
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
						try: async () =>
							db.transaction(async (tx) => {
								const [inserted] = await tx
									.insert(portalBookings)
									.values({
										id: booking.id,
										businessId: booking.tenantId,
										branchId: booking.branchId,
										serviceId: booking.serviceId,
										roomId: booking.roomId,
										boardingId: booking.boardingId,
										idempotencyKey: booking.idempotencyKey,
										customerName: booking.customerName,
										customerPhone: booking.customerPhone,
										customerEmail: booking.customerEmail,
										petName: booking.petName,
										petSpecies: booking.petSpecies,
										petBreed: booking.petBreed,
										scheduledAt: booking.scheduledAt.toISOString(),
										estimatedCheckOutAt:
											booking.estimatedCheckOutAt?.toISOString() ?? null,
										notes: booking.notes,
										status: booking.status,
									})
									.onConflictDoNothing({
										target: [
											portalBookings.businessId,
											portalBookings.idempotencyKey,
										],
									})
									.returning();
								if (inserted) {
									return mapBookingRow(inserted);
								}

								const [existing] = await tx
									.select()
									.from(portalBookings)
									.where(
										and(
											eq(portalBookings.businessId, booking.tenantId),
											eq(portalBookings.idempotencyKey, booking.idempotencyKey),
										),
									)
									.limit(1);
								if (!existing) {
									throw new Error("Same-key portal booking disappeared.");
								}
								return mapBookingRow(existing);
							}),
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
							if (e instanceof DatabaseError) {
								return e;
							}
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
							if (e instanceof DatabaseError) {
								return e;
							}
							return new PortalError({ message: (e as Error).message });
						},
					}),
				),

			updateServiceStatus: (
				tenantId: TTenantId,
				serviceId: TPortalServiceId,
				isActive: boolean,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [updated] = await db
								.update(portalServices)
								.set({ isActive, updatedAt: new Date().toISOString() })
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
							if (e instanceof DatabaseError || e instanceof PortalError) {
								return e;
							}
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

			confirmBooking: (
				tenantId: TTenantId,
				bookingId: string,
				actorUserId = "00000000-0000-0000-0000-000000000000",
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								const [booking] = await tx
									.select()
									.from(portalBookings)
									.where(
										and(
											eq(portalBookings.id, bookingId),
											eq(portalBookings.businessId, tenantId),
										),
									)
									.for("update")
									.limit(1);

								if (!booking) {
									throw new PortalError({
										message: "Booking tidak ditemukan.",
									});
								}
								if (booking.status === "confirmed" && booking.boardingId) {
									return;
								}
								if (booking.status !== "pending") {
									throw new PortalError({
										message: "Hanya booking pending yang dapat dikonfirmasi.",
									});
								}
								if (!booking.roomId || !booking.estimatedCheckOutAt) {
									throw new PortalError({
										message:
											"Booking belum memiliki kamar atau tanggal checkout.",
									});
								}

								const checkIn = new Date(booking.scheduledAt);
								const checkOut = new Date(booking.estimatedCheckOutAt);
								if (checkOut <= checkIn) {
									throw new PortalError({
										message: "Tanggal checkout harus setelah tanggal check-in.",
									});
								}

								const [branch] = await tx
									.select()
									.from(branches)
									.where(
										and(
											eq(branches.id, booking.branchId),
											eq(branches.businessId, tenantId),
											eq(branches.isActive, true),
										),
									)
									.for("update")
									.limit(1);
								if (!branch) {
									throw new PortalError({
										message: "Cabang tidak tersedia.",
									});
								}

								const [branchOccupancy] = await tx
									.select({ count: sql<number>`count(*)::int` })
									.from(boardings)
									.where(
										and(
											eq(boardings.businessId, tenantId),
											eq(boardings.branchId, booking.branchId),
											inArray(boardings.status, ["active", "draft"]),
										),
									);
								if ((branchOccupancy?.count ?? 0) >= branch.capacity) {
									throw new PortalError({
										message: "Kapasitas cabang penuh.",
									});
								}

								const [room] = await tx
									.select()
									.from(rooms)
									.where(
										and(
											eq(rooms.id, booking.roomId),
											eq(rooms.businessId, tenantId),
											eq(rooms.isActive, true),
										),
									)
									.for("update")
									.limit(1);
								if (!room || room.branchId !== booking.branchId) {
									throw new PortalError({
										message: "Kamar tidak tersedia pada cabang ini.",
									});
								}

								const [occupancy] = await tx
									.select({ count: sql<number>`count(*)::int` })
									.from(boardings)
									.where(
										and(
											eq(boardings.roomId, booking.roomId),
											sql`${boardings.status} IN ('active', 'draft')`,
											sql`${boardings.checkInDate} < ${toDateOnlyString(checkOut)}`,
											sql`(${boardings.estimatedCheckOutDate} IS NULL OR ${boardings.estimatedCheckOutDate} > ${toDateOnlyString(checkIn)})`,
										),
									);
								if ((occupancy?.count ?? 0) >= room.capacity) {
									throw new PortalError({
										message: "Kamar penuh untuk rentang tanggal tersebut.",
									});
								}

								const [customer] = await tx
									.insert(customers)
									.values({
										businessId: tenantId,
										fullName: booking.customerName,
										phone: booking.customerPhone,
										email: booking.customerEmail,
									})
									.onConflictDoUpdate({
										target: [customers.businessId, customers.phone],
										set: {
											fullName: booking.customerName,
											email: booking.customerEmail,
											updatedAt: new Date().toISOString(),
										},
									})
									.returning({ id: customers.id });
								if (!customer) {
									throw new PortalError({
										message: "Gagal menyimpan pelanggan.",
									});
								}

								const [existingPet] = await tx
									.select({ id: pets.id })
									.from(pets)
									.where(
										and(
											eq(pets.businessId, tenantId),
											eq(pets.customerId, customer.id),
											eq(pets.name, booking.petName),
										),
									)
									.limit(1);
								const petId = existingPet?.id ?? generateId();
								if (!existingPet) {
									await tx.insert(pets).values({
										id: petId,
										businessId: tenantId,
										customerId: customer.id,
										name: booking.petName,
										species: toPetKind(booking.petSpecies),
										breed: booking.petBreed,
									});
								}

								const boardingId = generateId();
								await tx.insert(boardings).values({
									id: boardingId,
									businessId: tenantId,
									branchId: booking.branchId,
									createdBy: actorUserId,
									customerId: customer.id,
									ownerName: booking.customerName,
									ownerAddress: "-",
									ownerPhone: booking.customerPhone,
									checkInDate: toDateOnlyString(checkIn),
									estimatedCheckOutDate: toDateOnlyString(checkOut),
									roomId: room.id,
									dailyRate: room.dailyRate,
									status: "active",
									notes: booking.notes,
								});
								await tx.insert(boardingPets).values({
									boardingId,
									petId,
									name: booking.petName,
									kind: toPetKind(booking.petSpecies),
									breed: booking.petBreed ?? "unknown",
									vaccinated: "no",
								});
								await tx
									.update(portalBookings)
									.set({
										status: "confirmed",
										boardingId,
										updatedAt: new Date().toISOString(),
									})
									.where(eq(portalBookings.id, booking.id));
							});
						},
						catch: (e) => {
							if (e instanceof PortalError) {
								return e;
							}
							return new DatabaseError({ cause: e });
						},
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
							if (e instanceof DatabaseError) {
								return e;
							}
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
							if (e instanceof DatabaseError) {
								return e;
							}
							return new PortalError({ message: (e as Error).message });
						},
					}),
				),
		}),
	),
);
