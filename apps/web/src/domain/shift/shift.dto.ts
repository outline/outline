import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TStaffAttendance,
	TStaffAttendanceId,
	TStaffSchedule,
	TStaffScheduleId,
} from "./shift.types";

export type TStaffScheduleDto = {
	readonly id: string;
	readonly business_id: string;
	readonly staff_id: string;
	readonly day_of_week: number;
	readonly start_time: string;
	readonly end_time: string;
	readonly is_off_day: boolean;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toStaffSchedule = (dto: TStaffScheduleDto): TStaffSchedule => ({
	id: dto.id as TStaffScheduleId,
	tenantId: dto.business_id as TTenantId,
	staffId: dto.staff_id as TStaffId,
	dayOfWeek: dto.day_of_week,
	startTime: dto.start_time,
	endTime: dto.end_time,
	isOffDay: dto.is_off_day,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export type TStaffAttendanceDto = {
	readonly id: string;
	readonly business_id: string;
	readonly staff_id: string;
	readonly date: string;
	readonly clock_in: string | null;
	readonly clock_out: string | null;
	readonly notes: string | null;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toStaffAttendance = (
	dto: TStaffAttendanceDto,
): TStaffAttendance => ({
	id: dto.id as TStaffAttendanceId,
	tenantId: dto.business_id as TTenantId,
	staffId: dto.staff_id as TStaffId,
	date: dto.date,
	clockIn: dto.clock_in ? new Date(dto.clock_in) : null,
	clockOut: dto.clock_out ? new Date(dto.clock_out) : null,
	notes: dto.notes,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});
