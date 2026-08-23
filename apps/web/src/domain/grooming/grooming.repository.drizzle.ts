import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { Effect, Layer } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TPetId } from "@/domain/pet/pet.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import type * as schema from "@/infra/db/drizzle/schema";
import {
	groomingAddons,
	groomingAppointmentAddons,
	groomingAppointments,
	groomingPhotos,
	groomingServices,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId, withRetry } from "@/shared/utils";
import {
	AddonNotFoundError,
	AppointmentNotFoundError,
	GroomingServiceNotFoundError,
} from "./grooming.errors";
import { GroomingRepository } from "./grooming.repository";
import type {
	TAppointmentStatus,
	TGroomingAddon,
	TGroomingAddonId,
	TGroomingAppointment,
	TGroomingAppointmentAddon,
	TGroomingAppointmentId,
	TGroomingPhoto,
	TGroomingPhotoId,
	TGroomingService,
	TGroomingServiceId,
	TPetSize,
} from "./grooming.types";

type TDb = NeonDatabase<typeof schema>;
type TGroomingServiceRow = typeof groomingServices.$inferSelect;
type TGroomingAddonRow = typeof groomingAddons.$inferSelect;
type TGroomingAppointmentRow = typeof groomingAppointments.$inferSelect;
type TGroomingAppointmentAddonRow =
	typeof groomingAppointmentAddons.$inferSelect;
type TGroomingPhotoRow = typeof groomingPhotos.$inferSelect;

const mapService = (row: TGroomingServiceRow): TGroomingService => ({
	id: row.id as TGroomingServiceId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	description: row.description,
	durationMinutes: row.durationMinutes,
	priceSmall: Number(row.priceSmall),
	priceMedium: Number(row.priceMedium),
	priceLarge: Number(row.priceLarge),
	priceXl: Number(row.priceXl),
	isActive: row.isActive,
	sortOrder: row.sortOrder ?? 0,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapAddon = (row: TGroomingAddonRow): TGroomingAddon => ({
	id: row.id as TGroomingAddonId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	price: Number(row.price),
	isActive: row.isActive,
	createdAt: new Date(row.createdAt),
});

const mapAppointment = (
	row: TGroomingAppointmentRow,
): TGroomingAppointment => ({
	id: row.id as TGroomingAppointmentId,
	tenantId: row.businessId as TTenantId,
	branchId: (row.branchId ?? null) as TBranchId | null,
	serviceId: row.serviceId as TGroomingServiceId,
	petId: row.petId as TPetId,
	customerId: (row.customerId ?? null) as TCustomerId | null,
	groomerId: row.groomerId,
	petSize: row.petSize as TPetSize,
	price: Number(row.price),
	status: row.status as TAppointmentStatus,
	scheduledAt: new Date(row.scheduledAt),
	startedAt: row.startedAt ? new Date(row.startedAt) : null,
	completedAt: row.completedAt ? new Date(row.completedAt) : null,
	notes: row.notes,
	cancellationReason: row.cancellationReason,
	createdBy: (row.createdBy ?? null) as TUserId | null,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapAppointmentAddon = (
	row: TGroomingAppointmentAddonRow,
): TGroomingAppointmentAddon => ({
	id: row.id,
	appointmentId: row.appointmentId as TGroomingAppointmentId,
	addonId: row.addonId as TGroomingAddonId,
	price: Number(row.price),
});

const mapPhoto = (row: TGroomingPhotoRow): TGroomingPhoto => ({
	id: row.id as TGroomingPhotoId,
	appointmentId: row.appointmentId as TGroomingAppointmentId,
	photoUrl: row.photoUrl,
	photoType: row.photoType as "before" | "after",
	uploadedAt: new Date(row.uploadedAt),
});

/**
 * Port of `public.atomic_book_grooming_appointment`.
 * Inserts a grooming_appointment row plus N grooming_appointment_addons
 * rows in a single transaction; we replicate that with `db.transaction()`
 * so the operation stays atomic.
 *
 * The transaction rolls back if any insert fails (e.g., a missing
 * service / pet / addon FK), mirroring the original RPC's EXCEPTION handler.
 */
export const GroomingRepositoryDrizzle = Layer.effect(
	GroomingRepository,
	Effect.map(IDrizzleClient, (db: TDb) =>
		GroomingRepository.of({
			// Services
			getServices: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingServices)
								.where(eq(groomingServices.businessId, tenantId))
								.orderBy(asc(groomingServices.sortOrder));
							return rows.map(mapService);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getServiceById: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingServices)
								.where(
									and(
										eq(groomingServices.id, id),
										eq(groomingServices.businessId, tenantId),
									),
								)
								.limit(1);
							const row = rows[0];
							if (!row) {
								throw new GroomingServiceNotFoundError({ serviceId: id });
							}
							return mapService(row);
						},
						catch: (e) => {
							if (e instanceof GroomingServiceNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),

			saveService: (service) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const id = generateId<TGroomingServiceId>();
							const rows = await db
								.insert(groomingServices)
								.values({
									id,
									businessId: service.tenantId,
									name: service.name,
									description: service.description,
									durationMinutes: service.durationMinutes,
									priceSmall: String(service.priceSmall),
									priceMedium: String(service.priceMedium),
									priceLarge: String(service.priceLarge),
									priceXl: String(service.priceXl),
									isActive: service.isActive,
									sortOrder: service.sortOrder,
								})
								.returning();
							const inserted = rows[0];
							if (!inserted) {
								throw new DatabaseError({
									cause: new Error("saveService: no row returned"),
								});
							}
							return mapService(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			updateService: (id, updates, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.update(groomingServices)
								.set({
									...(updates.name !== undefined && { name: updates.name }),
									...(updates.description !== undefined && {
										description: updates.description,
									}),
									...(updates.durationMinutes !== undefined && {
										durationMinutes: updates.durationMinutes,
									}),
									...(updates.priceSmall !== undefined && {
										priceSmall: String(updates.priceSmall),
									}),
									...(updates.priceMedium !== undefined && {
										priceMedium: String(updates.priceMedium),
									}),
									...(updates.priceLarge !== undefined && {
										priceLarge: String(updates.priceLarge),
									}),
									...(updates.priceXl !== undefined && {
										priceXl: String(updates.priceXl),
									}),
									...(updates.isActive !== undefined && {
										isActive: updates.isActive,
									}),
									...(updates.sortOrder !== undefined && {
										sortOrder: updates.sortOrder,
									}),
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(groomingServices.id, id),
										eq(groomingServices.businessId, tenantId),
									),
								)
								.returning();
							const updated = rows[0];
							if (!updated) {
								throw new GroomingServiceNotFoundError({ serviceId: id });
							}
							return mapService(updated);
						},
						catch: (e) => {
							if (e instanceof GroomingServiceNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),

			deleteService: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.delete(groomingServices)
								.where(
									and(
										eq(groomingServices.id, id),
										eq(groomingServices.businessId, tenantId),
									),
								)
								.returning({ id: groomingServices.id });
							if (rows.length === 0) {
								throw new GroomingServiceNotFoundError({ serviceId: id });
							}
						},
						catch: (e) => {
							if (e instanceof GroomingServiceNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),

			// Addons
			getAddons: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingAddons)
								.where(eq(groomingAddons.businessId, tenantId))
								.orderBy(asc(groomingAddons.name));
							return rows.map(mapAddon);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getAddonById: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingAddons)
								.where(
									and(
										eq(groomingAddons.id, id),
										eq(groomingAddons.businessId, tenantId),
									),
								)
								.limit(1);
							const row = rows[0];
							if (!row) {
								throw new AddonNotFoundError({ addonId: id });
							}
							return mapAddon(row);
						},
						catch: (e) => {
							if (e instanceof AddonNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),

			// Appointments
			getAppointments: (tenantId, dateRange) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingAppointments)
								.where(
									and(
										eq(groomingAppointments.businessId, tenantId),
										gte(
											groomingAppointments.scheduledAt,
											dateRange.start.toISOString(),
										),
										lte(
											groomingAppointments.scheduledAt,
											dateRange.end.toISOString(),
										),
									),
								)
								.orderBy(asc(groomingAppointments.scheduledAt));
							return rows.map(mapAppointment);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getAppointmentsByGroomer: (tenantId, groomerId, dateRange) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingAppointments)
								.where(
									and(
										eq(groomingAppointments.businessId, tenantId),
										eq(groomingAppointments.groomerId, groomerId),
										gte(
											groomingAppointments.scheduledAt,
											dateRange.start.toISOString(),
										),
										lte(
											groomingAppointments.scheduledAt,
											dateRange.end.toISOString(),
										),
									),
								)
								.orderBy(asc(groomingAppointments.scheduledAt));
							return rows.map(mapAppointment);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getAppointmentById: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingAppointments)
								.where(
									and(
										eq(groomingAppointments.id, id),
										eq(groomingAppointments.businessId, tenantId),
									),
								)
								.limit(1);
							const row = rows[0];
							if (!row) {
								throw new AppointmentNotFoundError({ appointmentId: id });
							}
							return mapAppointment(row);
						},
						catch: (e) => {
							if (e instanceof AppointmentNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),

			bookAppointment: (appointment, addons) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const id = generateId<TGroomingAppointmentId>();
							const now = new Date();
							const insertedRows = await db.transaction(async (tx: TDb) => {
								if (appointment.groomerId !== null) {
									const existing = await tx
										.select({ id: groomingAppointments.id })
										.from(groomingAppointments)
										.where(
											and(
												eq(
													groomingAppointments.groomerId,
													appointment.groomerId,
												),
												eq(
													groomingAppointments.scheduledAt,
													appointment.scheduledAt.toISOString(),
												),
												eq(
													groomingAppointments.businessId,
													appointment.tenantId,
												),
												ne(groomingAppointments.status, "cancelled"),
											),
										)
										.for("update")
										.limit(1);

									if (existing.length > 0) {
										throw new Error(
											`Groomer ${appointment.groomerId} already has an appointment at ${appointment.scheduledAt.toISOString()}`,
										);
									}
								}

								const inserted = await tx
									.insert(groomingAppointments)
									.values({
										id,
										businessId: appointment.tenantId,
										branchId: appointment.branchId,
										serviceId: appointment.serviceId,
										petId: appointment.petId,
										customerId: appointment.customerId,
										groomerId: appointment.groomerId,
										petSize: appointment.petSize,
										price: String(appointment.price),
										status: appointment.status,
										scheduledAt: appointment.scheduledAt.toISOString(),
										notes: appointment.notes,
										createdBy: appointment.createdBy,
									})
									.returning();
								const row = inserted[0];
								if (!row) {
									throw new Error("bookAppointment: no appointment returned");
								}

								if (addons.length > 0) {
									await tx.insert(groomingAppointmentAddons).values(
										addons.map((a) => ({
											appointmentId: id,
											addonId: a.addonId,
											price: String(a.price),
										})),
									);
								}

								return [row];
							});

							const inserted = insertedRows[0];
							if (!inserted) {
								throw new Error(
									"bookAppointment: transaction returned no rows",
								);
							}
							return {
								id: id as TGroomingAppointmentId,
								...appointment,
								createdAt: now,
								updatedAt: now,
							};
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			updateAppointment: (id, updates, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.update(groomingAppointments)
								.set({
									...(updates.status !== undefined && {
										status: updates.status,
									}),
									...(updates.startedAt !== undefined && {
										startedAt: updates.startedAt
											? updates.startedAt.toISOString()
											: null,
									}),
									...(updates.completedAt !== undefined && {
										completedAt: updates.completedAt
											? updates.completedAt.toISOString()
											: null,
									}),
									...(updates.notes !== undefined && {
										notes: updates.notes,
									}),
									...(updates.cancellationReason !== undefined && {
										cancellationReason: updates.cancellationReason,
									}),
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(groomingAppointments.id, id),
										eq(groomingAppointments.businessId, tenantId),
									),
								)
								.returning();
							const updated = rows[0];
							if (!updated) {
								throw new AppointmentNotFoundError({ appointmentId: id });
							}
							return mapAppointment(updated);
						},
						catch: (e) => {
							if (e instanceof AppointmentNotFoundError) return e;
							return new DatabaseError({ cause: e as Error });
						},
					}),
				),

			// Appointment Addons
			getAppointmentAddons: (appointmentId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingAppointmentAddons)
								.where(
									eq(groomingAppointmentAddons.appointmentId, appointmentId),
								);
							return rows.map(mapAppointmentAddon);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			// Photos
			getPhotos: (appointmentId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(groomingPhotos)
								.where(eq(groomingPhotos.appointmentId, appointmentId))
								.orderBy(desc(groomingPhotos.uploadedAt));
							return rows.map(mapPhoto);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			savePhoto: (photo) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const id = generateId<TGroomingPhotoId>();
							const rows = await db
								.insert(groomingPhotos)
								.values({
									id,
									appointmentId: photo.appointmentId,
									photoUrl: photo.photoUrl,
									photoType: photo.photoType,
								})
								.returning();
							const inserted = rows[0];
							if (!inserted) {
								throw new DatabaseError({
									cause: new Error("savePhoto: no row returned"),
								});
							}
							return mapPhoto(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
		}),
	),
);
