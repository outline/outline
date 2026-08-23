import { Effect } from "effect";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { TRoom, TRoomId, TSeasonalPricing } from "./room.types";

type TCreateRoomData = {
	readonly branchId?: TBranchId | null;
	readonly name: string;
	readonly roomType: TRoom["roomType"];
	readonly capacity: number;
	readonly dailyRate: number;
	readonly description?: string | null;
	readonly isActive?: boolean;
	readonly sortOrder?: number;
};

export const createRoomEntity = (
	tenantId: TTenantId,
	data: TCreateRoomData,
): Effect.Effect<TRoom, never> => {
	return Effect.sync(() => {
		const now = new Date();
		return {
			id: generateId<TRoomId>(),
			tenantId,
			branchId: data.branchId ?? null,
			name: data.name,
			roomType: data.roomType,
			capacity: data.capacity,
			dailyRate: data.dailyRate,
			description: data.description ?? null,
			isActive: data.isActive ?? true,
			sortOrder: data.sortOrder ?? 0,
			createdAt: now,
			updatedAt: now,
		};
	});
};
export function calculateEffectiveDailyRate(
	room: TRoom,
	activeSeasonalPricing: TSeasonalPricing | null,
): number {
	if (!activeSeasonalPricing) return room.dailyRate;

	let rate = room.dailyRate;

	if (activeSeasonalPricing.surchargePercent > 0) {
		rate += rate * (activeSeasonalPricing.surchargePercent / 100);
	}

	if (activeSeasonalPricing.surchargeFixed > 0) {
		rate += activeSeasonalPricing.surchargeFixed;
	}

	return rate;
}
