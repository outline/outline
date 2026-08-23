import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import type {
	TRoom,
	TRoomId,
	TRoomType,
	TSeasonalPricing,
	TSeasonalPricingId,
} from "./room.types";

export type TRoomRow = {
	id: string;
	business_id: string;
	branch_id: string | null;
	name: string;
	room_type: string;
	capacity: number;
	daily_rate: number;
	description: string | null;
	is_active: boolean;
	sort_order: number | null;
	created_at: string;
	updated_at: string;
};

export type TSeasonalPricingRow = {
	id: string;
	business_id: string;
	name: string;
	start_date: string;
	end_date: string;
	surcharge_percent: number | null;
	surcharge_fixed: number | null;
	is_active: boolean;
};

export function toRoom(row: TRoomRow): TRoom {
	return {
		id: row.id as TRoomId,
		tenantId: row.business_id as TTenantId,
		branchId: row.branch_id as TBranchId | null,
		name: row.name,
		roomType: row.room_type as TRoomType,
		capacity: row.capacity,
		dailyRate: row.daily_rate,
		description: row.description,
		isActive: row.is_active,
		sortOrder: row.sort_order ?? 0,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

export function toSeasonalPricing(row: TSeasonalPricingRow): TSeasonalPricing {
	return {
		id: row.id as TSeasonalPricingId,
		tenantId: row.business_id as TTenantId,
		name: row.name,
		startDate: new Date(row.start_date),
		endDate: new Date(row.end_date),
		surchargePercent: row.surcharge_percent ?? 0,
		surchargeFixed: row.surcharge_fixed ?? 0,
		isActive: row.is_active,
	};
}
