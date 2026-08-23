import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branches,
	branchHolidays,
	branchMembers,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IBranchRepository } from "./branch.repository";
import type {
	TBranch,
	TBranchHoliday,
	TBranchHolidayId,
	TBranchId,
	TOperatingHours,
} from "./branch.types";

type TBranchRow = typeof branches.$inferSelect;
type TBranchHolidayRow = typeof branchHolidays.$inferSelect;

const mapBranchRow = (row: TBranchRow): TBranch => ({
	id: row.id as TBranchId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	address: row.address,
	phone: row.phone,
	isActive: row.isActive,
	email: row.email,
	whatsappNumber: row.whatsappNumber,
	streetAddress: row.streetAddress,
	addressLocality: row.addressLocality,
	addressRegion: row.addressRegion,
	postalCode: row.postalCode,
	addressCountry: row.addressCountry,
	latitude: row.latitude,
	longitude: row.longitude,
	operatingHours: row.operatingHours as TOperatingHours | null,
	createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
	updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
});

const mapHolidayRow = (row: TBranchHolidayRow): TBranchHoliday => ({
	id: row.id as TBranchHolidayId,
	branchId: row.branchId as TBranchId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	date: new Date(row.date),
	isRecurring: row.isRecurring ?? false,
	createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
});

/**
 * Port of `public.atomic_create_branch`.
 * Inserts a branch and adds the creator as a branch_member in one
 * transaction; we do the same with `db.transaction()` so the call stays
 * atomic.
 */
export const BranchRepositoryDrizzle = Layer.effect(
	IBranchRepository,
	Effect.map(IDrizzleClient, (db) =>
		IBranchRepository.of({
			findById: (id: TBranchId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.branches.findFirst({
								where: (b, { and, eq }) =>
									and(eq(b.id, id), eq(b.businessId, tenantId)),
							});
							if (!row) return null;
							return mapBranchRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findAll: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(branches)
								.where(eq(branches.businessId, tenantId))
								.orderBy(asc(branches.name));
							return rows.map(mapBranchRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			createBranch: (branch: TBranch, userId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								await tx.insert(branches).values({
									id: branch.id,
									businessId: branch.tenantId,
									name: branch.name,
									address: branch.address,
									phone: branch.phone,
									isActive: branch.isActive,
									email: branch.email,
									whatsappNumber: branch.whatsappNumber,
									streetAddress: branch.streetAddress,
									addressLocality: branch.addressLocality,
									addressRegion: branch.addressRegion,
									postalCode: branch.postalCode,
									addressCountry: branch.addressCountry,
									latitude: branch.latitude,
									longitude: branch.longitude,
									operatingHours: branch.operatingHours,
								});
								await tx
									.insert(branchMembers)
									.values({ branchId: branch.id, userId })
									.onConflictDoNothing({
										target: [branchMembers.branchId, branchMembers.userId],
									});
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			update: (branch: TBranch) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(branches)
								.set({
									name: branch.name,
									address: branch.address,
									phone: branch.phone,
									isActive: branch.isActive,
									email: branch.email,
									whatsappNumber: branch.whatsappNumber,
									streetAddress: branch.streetAddress,
									addressLocality: branch.addressLocality,
									addressRegion: branch.addressRegion,
									postalCode: branch.postalCode,
									addressCountry: branch.addressCountry,
									latitude: branch.latitude,
									longitude: branch.longitude,
									operatingHours: branch.operatingHours,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(branches.id, branch.id),
										eq(branches.businessId, branch.tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findHolidays: (branchId: TBranchId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(branchHolidays)
								.where(
									and(
										eq(branchHolidays.branchId, branchId),
										eq(branchHolidays.businessId, tenantId),
									),
								)
								.orderBy(asc(branchHolidays.date));
							return rows.map(mapHolidayRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveHoliday: (holiday: TBranchHoliday) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(branchHolidays).values({
								id: holiday.id,
								branchId: holiday.branchId,
								businessId: holiday.tenantId,
								name: holiday.name,
								date: holiday.date.toISOString().split("T")[0] ?? "",
								isRecurring: holiday.isRecurring,
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			deleteHoliday: (
				id: TBranchHolidayId,
				branchId: TBranchId,
				tenantId: TTenantId,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.delete(branchHolidays)
								.where(
									and(
										eq(branchHolidays.id, id),
										eq(branchHolidays.branchId, branchId),
										eq(branchHolidays.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
