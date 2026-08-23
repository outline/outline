import type { TBranchId, TId, TTenantId } from "@/shared/types/common.types";

export type TRoomId = TId & { readonly _brand: "RoomId" };
export type TSeasonalPricingId = TId & { readonly _brand: "SeasonalPricingId" };

export const ROOM_TYPE = ["standard", "deluxe", "suite", "vip"] as const;
export type TRoomType = (typeof ROOM_TYPE)[number];

export type TRoom = {
	readonly id: TRoomId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId | null;
	readonly name: string;
	readonly roomType: TRoomType;
	readonly capacity: number;
	readonly dailyRate: number;
	readonly description: string | null;
	readonly isActive: boolean;
	readonly sortOrder: number;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TSeasonalPricing = {
	readonly id: TSeasonalPricingId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly startDate: Date;
	readonly endDate: Date;
	readonly surchargePercent: number;
	readonly surchargeFixed: number;
	readonly isActive: boolean;
};
