export interface TStaffAttendanceDto {
	readonly id: string;
	readonly businessId: string;
	readonly staffId: string;
	readonly date: string;
	readonly clockIn: string | null;
	readonly clockOut: string | null;
	readonly notes: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TShiftDto extends TStaffAttendanceDto {
	readonly staffName: string;
}

export interface TOnShiftDto {
	readonly staffId: string;
	readonly staffName: string;
	readonly since: string;
}
