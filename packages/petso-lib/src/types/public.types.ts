export interface TPublicBusinessDto {
	readonly id: string;
	readonly name: string;
	readonly slug: string | null;
	readonly logoUrl: string | null;
	readonly address?: string | null;
	readonly phone?: string | null;
}

export interface TPublicBranchDto {
	readonly id: string;
	readonly businessId: string;
	readonly name: string;
	readonly address: string | null;
	readonly phone: string | null;
	readonly capacity: number;
	readonly isActive: boolean;
}

export interface TPublicRoomDto {
	readonly id: string;
	readonly businessId: string;
	readonly branchId: string | null;
	readonly name: string;
	readonly description: string | null;
	readonly roomType: string;
	readonly capacity: number;
	readonly dailyRate: number;
	readonly isActive: boolean;
	readonly occupied: number;
	readonly available: number;
}

export interface TPublicProductDto {
	readonly id: string;
	readonly businessId: string;
	readonly name: string;
	readonly description: string | null;
	readonly price: number;
	readonly imageUrl: string | null;
	readonly category: string | null;
	readonly isActive: boolean;
	readonly sku: string | null;
	readonly stock: number;
	readonly unit: string | null;
}

export interface TPublicBookingInput {
	readonly customerName: string;
	readonly customerPhone: string;
	readonly petName: string;
	readonly scheduledAt: string;
	readonly branchId?: string;
	readonly notes?: string;
}

export interface TPublicBookingDto {
	readonly id: string;
	readonly code: string;
}

export interface TPublicBookingResult {
	readonly created: boolean;
	readonly code: string;
	readonly booking: TPublicBookingDto;
}
