import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { staffAttendances, staffSchedules } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId, withRetry } from "@/shared/utils";
import { StaffScheduleNotFoundError } from "./shift.errors";
import { ShiftRepository } from "./shift.repository";
import type {
	TStaffAttendance,
	TStaffAttendanceId,
	TStaffSchedule,
	TStaffScheduleId,
} from "./shift.types";

type TScheduleRow = typeof staffSchedules.$inferSelect;
type TAttendanceRow = typeof staffAttendances.$inferSelect;

const mapScheduleRow = (row: TScheduleRow): TStaffSchedule => ({
	id: row.id as TStaffScheduleId,
	tenantId: row.businessId as TTenantId,
	staffId: row.staffId as TStaffId,
	dayOfWeek: row.dayOfWeek,
	startTime: row.startTime,
	endTime: row.endTime,
	isOffDay: row.isOffDay,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapAttendanceRow = (row: TAttendanceRow): TStaffAttendance => ({
	id: row.id as TStaffAttendanceId,
	tenantId: row.businessId as TTenantId,
	staffId: row.staffId as TStaffId,
	date: row.date,
	clockIn: row.clockIn ? new Date(row.clockIn) : null,
	clockOut: row.clockOut ? new Date(row.clockOut) : null,
	notes: row.notes,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

export const ShiftRepositoryDrizzle = Layer.effect(
	ShiftRepository,
	Effect.map(IDrizzleClient, (db) =>
		ShiftRepository.of({
			findSchedulesByStaffId: (staffId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.staffSchedules.findMany({
								where: and(
									eq(staffSchedules.staffId, staffId),
									eq(staffSchedules.businessId, tenantId),
								),
								orderBy: [asc(staffSchedules.dayOfWeek)],
							});
							return rows.map(mapScheduleRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveSchedule: (schedule) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const nowIso = new Date().toISOString();
							// `staff_schedules` has a unique index on (staff_id,
							// day_of_week) — `onConflictDoUpdate` mirrors the live
							// adapter's `.upsert(..., { onConflict: "staff_id,
							// day_of_week" })` so re-saving for the same day
							// overwrites the existing row instead of throwing.
							const [inserted] = await db
								.insert(staffSchedules)
								.values({
									id: generateId(),
									businessId: schedule.tenantId,
									staffId: schedule.staffId,
									dayOfWeek: schedule.dayOfWeek,
									startTime: schedule.startTime,
									endTime: schedule.endTime,
									isOffDay: schedule.isOffDay,
								})
								.onConflictDoUpdate({
									target: [staffSchedules.staffId, staffSchedules.dayOfWeek],
									set: {
										businessId: schedule.tenantId,
										startTime: schedule.startTime,
										endTime: schedule.endTime,
										isOffDay: schedule.isOffDay,
										updatedAt: nowIso,
									},
								})
								.returning();
							if (!inserted) {
								throw new Error("staff_schedules upsert returned no row");
							}
							return mapScheduleRow(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateSchedule: (id, tenantId, schedule) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const patch: Partial<typeof staffSchedules.$inferInsert> = {};
							if (schedule.dayOfWeek !== undefined)
								patch.dayOfWeek = schedule.dayOfWeek;
							if (schedule.startTime !== undefined)
								patch.startTime = schedule.startTime;
							if (schedule.endTime !== undefined)
								patch.endTime = schedule.endTime;
							if (schedule.isOffDay !== undefined)
								patch.isOffDay = schedule.isOffDay;
							patch.updatedAt = new Date().toISOString();

							const [updated] = await db
								.update(staffSchedules)
								.set(patch)
								.where(
									and(
										eq(staffSchedules.id, id),
										eq(staffSchedules.businessId, tenantId),
									),
								)
								.returning();
							if (!updated) return null;
							return mapScheduleRow(updated);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				).pipe(
					Effect.flatMap((s) =>
						s
							? Effect.succeed(s)
							: Effect.fail(new StaffScheduleNotFoundError({ id })),
					),
				),

			deleteSchedule: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.delete(staffSchedules)
								.where(
									and(
										eq(staffSchedules.id, id),
										eq(staffSchedules.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findAttendanceByDate: (staffId, date, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const row = await db.query.staffAttendances.findFirst({
								where: and(
									eq(staffAttendances.staffId, staffId),
									eq(staffAttendances.businessId, tenantId),
									eq(staffAttendances.date, date),
								),
							});
							return row ? mapAttendanceRow(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findAttendanceByDateRange: (staffId, startDate, endDate, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db.query.staffAttendances.findMany({
								where: and(
									eq(staffAttendances.staffId, staffId),
									eq(staffAttendances.businessId, tenantId),
									gte(staffAttendances.date, startDate),
									lte(staffAttendances.date, endDate),
								),
								orderBy: [desc(staffAttendances.date)],
							});
							return rows.map(mapAttendanceRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveAttendance: (attendance) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [inserted] = await db
								.insert(staffAttendances)
								.values({
									id: generateId(),
									businessId: attendance.tenantId,
									staffId: attendance.staffId,
									date: attendance.date,
									clockIn: attendance.clockIn
										? attendance.clockIn.toISOString()
										: null,
									clockOut: attendance.clockOut
										? attendance.clockOut.toISOString()
										: null,
									notes: attendance.notes,
								})
								.returning();
							if (!inserted) {
								throw new Error("staff_attendances insert returned no row");
							}
							return mapAttendanceRow(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateAttendance: (id, tenantId, updates) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const patch: Partial<typeof staffAttendances.$inferInsert> = {};
							if (updates.clockOut !== undefined) {
								patch.clockOut = updates.clockOut
									? updates.clockOut.toISOString()
									: null;
							}
							if (updates.notes !== undefined) {
								patch.notes = updates.notes;
							}
							patch.updatedAt = new Date().toISOString();

							const [updated] = await db
								.update(staffAttendances)
								.set(patch)
								.where(
									and(
										eq(staffAttendances.id, id),
										eq(staffAttendances.businessId, tenantId),
									),
								)
								.returning();
							if (!updated) {
								throw new Error("staff_attendances update returned no row");
							}
							return mapAttendanceRow(updated);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
