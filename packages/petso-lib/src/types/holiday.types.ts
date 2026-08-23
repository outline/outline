export interface TBranchHolidayDto {
	readonly id: string;
	readonly branchId: string;
	readonly name: string;
	readonly date: string;
	readonly isRecurring: boolean;
	readonly createdAt: string;
}

export interface TCreateBranchHolidayInput {
	readonly branchId: string;
	readonly name: string;
	readonly date: string;
	readonly isRecurring?: boolean;
}
