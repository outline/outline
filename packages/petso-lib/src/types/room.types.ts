export interface TRoomDto {
	readonly id: string;
	readonly branchId: string | null;
	readonly name: string;
	readonly roomType: string;
	readonly capacity: number;
	readonly dailyRate: number;
	readonly description: string | null;
	readonly isActive: boolean;
	readonly sortOrder: number;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TCreateRoomInput {
	readonly branchId: string;
	readonly name: string;
	readonly roomType: "standard" | "deluxe" | "suite" | "vip";
	readonly capacity: number;
	readonly dailyRate: number;
	readonly description?: string | null;
	readonly isActive?: boolean;
	readonly sortOrder?: number;
}

export interface TUpdateRoomInput {
	readonly id: string;
	readonly branchId?: string | null;
	readonly name?: string;
	readonly roomType?: "standard" | "deluxe" | "suite" | "vip";
	readonly capacity?: number;
	readonly dailyRate?: number;
	readonly description?: string | null;
	readonly isActive?: boolean;
	readonly sortOrder?: number;
}
