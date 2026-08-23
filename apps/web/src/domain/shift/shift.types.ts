import type { TStaffId } from "@/domain/staff/staff.types";
import type { TId, TTenantId } from "@/shared/types/common.types";

export type TStaffScheduleId = TId & { readonly _brand: "StaffScheduleId" };
export type TStaffAttendanceId = TId & { readonly _brand: "StaffAttendanceId" };

export type TStaffSchedule = {
	readonly id: TStaffScheduleId;
	readonly tenantId: TTenantId;
	readonly staffId: TStaffId;
	readonly dayOfWeek: number;
	readonly startTime: string;
	readonly endTime: string;
	readonly isOffDay: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TStaffAttendance = {
	readonly id: TStaffAttendanceId;
	readonly tenantId: TTenantId;
	readonly staffId: TStaffId;
	readonly date: string;
	readonly clockIn: Date | null;
	readonly clockOut: Date | null;
	readonly notes: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};
