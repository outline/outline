import { Effect, Schema } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import {
	createAttendanceEntity,
	createScheduleEntity,
	updateScheduleData,
} from "./shift.module";
import { ShiftRepository } from "./shift.repository";
import {
	ClockInSchema,
	ClockOutSchema,
	CreateStaffScheduleSchema,
	UpdateStaffScheduleSchema,
} from "./shift.schemas";
import type { TStaffScheduleId } from "./shift.types";

export const getAllAttendanceProgram = (tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		return yield* _(repo.findAllAttendance(tenantId));
	});

export const getStaffSchedulesProgram = (
	tenantId: TTenantId,
	staffId: TStaffId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		return yield* _(repo.findSchedulesByStaffId(staffId, tenantId));
	});

export const saveStaffScheduleProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		const parsed = yield* _(
			Schema.decodeUnknown(CreateStaffScheduleSchema)(data),
		);

		const scheduleEntity = yield* _(createScheduleEntity(tenantId, parsed));
		return yield* _(repo.saveSchedule(scheduleEntity));
	});

export const updateStaffScheduleProgram = (
	tenantId: TTenantId,
	data: unknown,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		const parsed = yield* _(
			Schema.decodeUnknown(UpdateStaffScheduleSchema)(data),
		);

		const updates = yield* _(updateScheduleData(parsed));
		return yield* _(
			repo.updateSchedule(parsed.id as TStaffScheduleId, tenantId, updates),
		);
	});

export const deleteStaffScheduleProgram = (tenantId: TTenantId, id: string) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		return yield* _(repo.deleteSchedule(id as TStaffScheduleId, tenantId));
	});

export const getAttendanceProgram = (
	tenantId: TTenantId,
	staffId: TStaffId,
	date: string,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		return yield* _(repo.findAttendanceByDate(staffId, date, tenantId));
	});

export const getStaffAttendanceHistoryProgram = (
	tenantId: TTenantId,
	staffId: TStaffId,
	startDate: string,
	endDate: string,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		return yield* _(
			repo.findAttendanceByDateRange(staffId, startDate, endDate, tenantId),
		);
	});

export const clockInProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		const parsed = yield* _(Schema.decodeUnknown(ClockInSchema)(data));

		const existing = yield* _(
			repo.findAttendanceByDate(
				parsed.staffId as TStaffId,
				parsed.date,
				tenantId,
			),
		);
		if (existing) {
			return existing; // Already clocked in for this date
		}

		const attendanceEntity = yield* _(createAttendanceEntity(tenantId, parsed));
		return yield* _(repo.saveAttendance(attendanceEntity));
	});

export const clockOutProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ShiftRepository);
		const parsed = yield* _(Schema.decodeUnknown(ClockOutSchema)(data));

		const existing = yield* _(
			repo.findAttendanceByDate(
				parsed.staffId as TStaffId,
				parsed.date,
				tenantId,
			),
		);
		if (!existing) {
			throw new Error("Belum melakukan clock in hari ini");
		}
		if (existing.clockOut) {
			return existing; // Already clocked out
		}

		return yield* _(
			repo.updateAttendance(existing.id, tenantId, {
				clockOut: new Date(),
				notes: parsed.notes || existing.notes,
			}),
		);
	});
