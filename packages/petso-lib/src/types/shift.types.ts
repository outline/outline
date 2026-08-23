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
