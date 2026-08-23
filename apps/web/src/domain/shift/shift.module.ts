import { Effect } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	ClockInSchema,
	CreateStaffScheduleSchema,
	UpdateStaffScheduleSchema,
} from "./shift.schemas";
import type { TStaffAttendance, TStaffSchedule } from "./shift.types";

export const createScheduleEntity = (
	tenantId: TTenantId,
	data: typeof CreateStaffScheduleSchema.Type,
) =>
	Effect.sync(() => {
		const schedule: Omit<TStaffSchedule, "id" | "createdAt" | "updatedAt"> = {
			tenantId,
			staffId: data.staffId as TStaffId,
			dayOfWeek: data.dayOfWeek,
			startTime: data.startTime,
			endTime: data.endTime,
			isOffDay: data.isOffDay,
		};
		return schedule;
	});

export const updateScheduleData = (
	data: typeof UpdateStaffScheduleSchema.Type,
) =>
	Effect.sync(() => {
		type TScheduleUpdates = Partial<
			Omit<TStaffSchedule, "id" | "tenantId" | "createdAt" | "updatedAt">
		>;
		const updates: Record<string, unknown> = {};

		if (data.dayOfWeek !== undefined) updates.dayOfWeek = data.dayOfWeek;
		if (data.startTime !== undefined) updates.startTime = data.startTime;
		if (data.endTime !== undefined) updates.endTime = data.endTime;
		if (data.isOffDay !== undefined) updates.isOffDay = data.isOffDay;

		return updates as TScheduleUpdates;
	});

export const createAttendanceEntity = (
	tenantId: TTenantId,
	data: typeof ClockInSchema.Type,
) =>
	Effect.sync(() => {
		const attendance: Omit<TStaffAttendance, "id" | "createdAt" | "updatedAt"> =
			{
				tenantId,
				staffId: data.staffId as TStaffId,
				date: data.date,
				clockIn: new Date(),
				clockOut: null,
				notes: data.notes || null,
			};
		return attendance;
	});
