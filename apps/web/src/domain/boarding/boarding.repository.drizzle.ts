import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	boardingCharges,
	boardingDailyPhotos,
	boardingPets,
	boardings,
	branches,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IBoardingRepository } from "./boarding.repository";
import type {
	TBoarding,
	TBoardingCharge,
	TBoardingChargeId,
	TBoardingDailyPhoto,
	TBoardingDailyPhotoId,
	TBoardingId,
	TBoardingStatus,
	TBoardingWithPets,
	TPet,
	TPetId,
	TPetKind,
} from "./boarding.types";

type TBoardingRow = typeof boardings.$inferSelect;
type TBoardingPetRow = typeof boardingPets.$inferSelect;

// `check_in_date` / `estimated_check_out_date` are SQL `date` columns (not
// `timestamp`) in the live schema — drizzle represents them as plain
// "YYYY-MM-DD" strings, so writes need to be formatted accordingly.
const toDateOnlyString = (d: Date): string => d.toISOString().slice(0, 10);

const mapPetRow = (p: TBoardingPetRow): TPet => ({
	id: p.id as TPetId,
	boardingId: p.boardingId as TBoardingId,
	name: p.name,
	kind: p.kind as TPetKind,
	breed: p.breed,
	vaccinated: p.vaccinated as "yes" | "no",
	weight: p.weight,
	// `health_status` is nullable in the live schema (default 'healthy');
	// the domain type requires a non-null string.
	healthStatus: p.healthStatus ?? "healthy",
	initialCondition: p.initialCondition,
	notes: p.notes,
	createdAt: new Date(p.createdAt),
	// `boarding_pets` has no `updated_at` column in the live schema — fall
	// back to `created_at` so the domain's required field is populated.
	updatedAt: new Date(p.createdAt),
});

const mapBoardingRow = (
	row: TBoardingRow,
	pets: readonly TPet[],
): TBoardingWithPets => ({
	id: row.id as TBoardingId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId as TBranchId,
	customerId: row.customerId,
	ownerName: row.ownerName,
	ownerAddress: row.ownerAddress,
	ownerPhone: row.ownerPhone,
	emergencyContactName: row.emergencyContactName,
	emergencyContactPhone: row.emergencyContactPhone,
	checkInDate: new Date(row.checkInDate),
	estimatedCheckOutDate: row.estimatedCheckOutDate
		? new Date(row.estimatedCheckOutDate)
		: null,
	notes: row.notes,
	status: row.status as TBoardingStatus,
	roomId: (row.roomId as import("../room/room.types").TRoomId) || null,
	dailyRate: row.dailyRate ? Number(row.dailyRate) : 0,
	actualCheckout: row.actualCheckout ? new Date(row.actualCheckout) : null,
	totalAmount: row.totalAmount ? Number(row.totalAmount) : 0,
	ownerSignature: row.ownerSignature,
	consentAcceptedAt: row.consentAcceptedAt
		? new Date(row.consentAcceptedAt)
		: null,
	createdBy: row.createdBy as TUserId,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
	pets,
});

export const BoardingRepositoryDrizzle = Layer.effect(
	IBoardingRepository,
	Effect.map(IDrizzleClient, (db) => {
		return IBoardingRepository.of({
			findById: (id: TBoardingId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db.query.boardings.findFirst({
								where: {
									RAW: (boardings, { and, eq }) =>
										and(eq(boardings.id, id), eq(boardings.businessId, tenantId)) ?? sql``,
								},
							});

							if (!result) return null;

							const petRows = await db
								.select()
								.from(boardingPets)
								.where(eq(boardingPets.boardingId, result.id));

							return mapBoardingRow(result, petRows.map(mapPetRow));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findAll: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const results = await db.query.boardings.findMany({
								where: { RAW: (boardings, { eq }) => eq(boardings.businessId, tenantId) },
								orderBy: (boardings, { desc }) => [desc(boardings.createdAt)],
							});

							if (results.length === 0) return [];

							const boardingIds = results.map((r) => r.id);
							const petRows = await db
								.select()
								.from(boardingPets)
								.where(inArray(boardingPets.boardingId, boardingIds));

							const petsByBoarding = new Map<string, TBoardingPetRow[]>();
							for (const p of petRows) {
								const list = petsByBoarding.get(p.boardingId) ?? [];
								list.push(p);
								petsByBoarding.set(p.boardingId, list);
							}

							return results.map((d) =>
								mapBoardingRow(
									d,
									(petsByBoarding.get(d.id) ?? []).map(mapPetRow),
								),
							);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveFull: (boardingWithPets: TBoardingWithPets) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// Capacity check + INSERT in one transaction so the
							// TOCTOU race that existed before (check outside the
							// transaction, INSERT inside) is closed. The branch
							// row is locked FOR UPDATE so concurrent bookings for
							// the same branch serialize through the row lock and
							// can never both observe an under-capacity count.
							await db.transaction(async (tx) => {
								const [branchResult] = await tx
									.select({
										id: branches.id,
										businessId: branches.businessId,
										capacity: branches.capacity,
									})
									.from(branches)
									.where(eq(branches.id, boardingWithPets.branchId))
									.for("update")
									.limit(1);

								if (!branchResult) {
									throw new Error("Branch not found");
								}
								if (branchResult.businessId !== boardingWithPets.tenantId) {
									throw new Error("Branch not found");
								}

								const activeCountRows = await tx
									.select({ count: sql<number>`count(*)::int` })
									.from(boardings)
									.where(
										and(
											eq(boardings.branchId, boardingWithPets.branchId),
											inArray(boardings.status, ["active", "draft"]),
										),
									);

								const activeCount = activeCountRows[0]?.count ?? 0;
								if (activeCount >= branchResult.capacity) {
									throw new Error("Branch capacity exceeded");
								}

								await tx.insert(boardings).values({
									id: boardingWithPets.id,
									businessId: boardingWithPets.tenantId,
									branchId: boardingWithPets.branchId,
									customerId: boardingWithPets.customerId,
									ownerName: boardingWithPets.ownerName,
									ownerAddress: boardingWithPets.ownerAddress,
									ownerPhone: boardingWithPets.ownerPhone,
									emergencyContactName: boardingWithPets.emergencyContactName,
									emergencyContactPhone: boardingWithPets.emergencyContactPhone,
									checkInDate: toDateOnlyString(boardingWithPets.checkInDate),
									estimatedCheckOutDate: boardingWithPets.estimatedCheckOutDate
										? toDateOnlyString(boardingWithPets.estimatedCheckOutDate)
										: null,
									notes: boardingWithPets.notes,
									status: boardingWithPets.status,
									consentAcceptedAt: (
										boardingWithPets.consentAcceptedAt ?? new Date()
									).toISOString(),
									createdBy: boardingWithPets.createdBy,
								});

								if (boardingWithPets.pets.length > 0) {
									await tx.insert(boardingPets).values(
										boardingWithPets.pets.map((p) => ({
											id: p.id,
											boardingId: boardingWithPets.id,
											name: p.name,
											kind: p.kind,
											breed: p.breed,
											vaccinated: p.vaccinated,
											weight: p.weight,
											healthStatus: p.healthStatus,
											initialCondition: p.initialCondition,
											notes: p.notes,
										})),
									);
								}
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			update: (boarding: TBoarding) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(boardings)
								.set({
									customerId: boarding.customerId,
									ownerName: boarding.ownerName,
									ownerAddress: boarding.ownerAddress,
									ownerPhone: boarding.ownerPhone,
									emergencyContactName: boarding.emergencyContactName,
									emergencyContactPhone: boarding.emergencyContactPhone,
									checkInDate: toDateOnlyString(boarding.checkInDate),
									estimatedCheckOutDate: boarding.estimatedCheckOutDate
										? toDateOnlyString(boarding.estimatedCheckOutDate)
										: null,
									notes: boarding.notes,
									status: boarding.status,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(boardings.id, boarding.id),
										eq(boardings.businessId, boarding.tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateFull: (boardingWithPets: TBoardingWithPets) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// NATIVE TRANSACTION — ACID compliant!
							await db.transaction(async (tx) => {
								// Update boarding
								await tx
									.update(boardings)
									.set({
										ownerName: boardingWithPets.ownerName,
										ownerAddress: boardingWithPets.ownerAddress,
										ownerPhone: boardingWithPets.ownerPhone,
										emergencyContactName: boardingWithPets.emergencyContactName,
										emergencyContactPhone:
											boardingWithPets.emergencyContactPhone,
										checkInDate: toDateOnlyString(boardingWithPets.checkInDate),
										estimatedCheckOutDate:
											boardingWithPets.estimatedCheckOutDate
												? toDateOnlyString(
														boardingWithPets.estimatedCheckOutDate,
													)
												: null,
										notes: boardingWithPets.notes,
										status: boardingWithPets.status,
										updatedAt: new Date().toISOString(),
									})
									.where(
										and(
											eq(boardings.id, boardingWithPets.id),
											eq(boardings.businessId, boardingWithPets.tenantId),
										),
									);

								// Delete old pets
								await tx
									.delete(boardingPets)
									.where(eq(boardingPets.boardingId, boardingWithPets.id));

								// Insert new pets
								if (boardingWithPets.pets.length > 0) {
									await tx.insert(boardingPets).values(
										boardingWithPets.pets.map((p) => ({
											id: p.id,
											boardingId: boardingWithPets.id,
											name: p.name,
											kind: p.kind,
											breed: p.breed,
											vaccinated: p.vaccinated,
											weight: p.weight,
											healthStatus: p.healthStatus,
											initialCondition: p.initialCondition,
											notes: p.notes,
										})),
									);
								}
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			delete: (id: TBoardingId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.delete(boardings)
								.where(
									and(eq(boardings.id, id), eq(boardings.businessId, tenantId)),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getCharges: (boardingId: TBoardingId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const boarding = await db.query.boardings.findFirst({
								where: {
									RAW: (boardings, { and, eq }) =>
									and(
										eq(boardings.id, boardingId),
										eq(boardings.businessId, tenantId),
									) ?? sql``,
								},
							});
							if (!boarding) return [];

							const rows = await db
								.select()
								.from(boardingCharges)
								.where(eq(boardingCharges.boardingId, boardingId))
								.orderBy(boardingCharges.chargeDate);
							return rows.map(
								(r): TBoardingCharge => ({
									id: r.id as TBoardingChargeId,
									boardingId: r.boardingId as TBoardingId,
									tenantId: r.businessId as TTenantId,
									description: r.description,
									amount: Number(r.amount),
									chargeDate: new Date(r.chargeDate),
									createdBy: r.createdBy as TUserId | null,
								}),
							);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			addCharge: (charge: TBoardingCharge, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const boarding = await db.query.boardings.findFirst({
								where: {
									RAW: (boardings, { and, eq }) =>
									and(
										eq(boardings.id, charge.boardingId),
										eq(boardings.businessId, tenantId),
									) ?? sql``,
								},
							});
							if (!boarding) {
								throw new Error("Boarding not found");
							}

							await db.insert(boardingCharges).values({
								id: charge.id,
								boardingId: charge.boardingId,
								businessId: charge.tenantId,
								description: charge.description,
								amount: charge.amount.toString(),
								chargeDate: charge.chargeDate.toISOString(),
								createdBy: charge.createdBy,
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getPhotos: (boardingId: TBoardingId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const boarding = await db.query.boardings.findFirst({
								where: {
									RAW: (boardings, { and, eq }) =>
									and(
										eq(boardings.id, boardingId),
										eq(boardings.businessId, tenantId),
									) ?? sql``,
								},
							});
							if (!boarding) return [];

							const rows = await db
								.select()
								.from(boardingDailyPhotos)
								.where(eq(boardingDailyPhotos.boardingId, boardingId))
								.orderBy(boardingDailyPhotos.takenDate);
							return rows.map(
								(r): TBoardingDailyPhoto => ({
									id: r.id as TBoardingDailyPhotoId,
									boardingId: r.boardingId as TBoardingId,
									photoUrl: r.photoUrl,
									caption: r.caption,
									takenDate: new Date(r.takenDate),
									uploadedAt: new Date(r.uploadedAt),
									uploadedBy: r.uploadedBy as TUserId | null,
								}),
							);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			addPhoto: (photo: TBoardingDailyPhoto, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const boarding = await db.query.boardings.findFirst({
								where: {
									RAW: (boardings, { and, eq }) =>
									and(
										eq(boardings.id, photo.boardingId),
										eq(boardings.businessId, tenantId),
									) ?? sql``,
								},
							});
							if (!boarding) {
								throw new Error("Boarding not found");
							}

							await db.insert(boardingDailyPhotos).values({
								id: photo.id,
								boardingId: photo.boardingId,
								photoUrl: photo.photoUrl,
								caption: photo.caption,
								takenDate: photo.takenDate.toISOString().slice(0, 10),
								uploadedAt: photo.uploadedAt.toISOString(),
								uploadedBy: photo.uploadedBy,
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		});
	}),
);
