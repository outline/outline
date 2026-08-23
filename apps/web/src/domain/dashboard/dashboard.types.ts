import type { TTenantId } from "@/shared/types/common.types";

export type TTopSellerItem = {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly salesCount: number;
	readonly revenue: number;
};

export type TInventoryStatusItem = {
	readonly name: string;
	readonly status: "Low Stock" | "In Stock" | "Out of Stock";
	readonly time: string;
};

export type TInventoryStatusResult = {
	readonly items: readonly TInventoryStatusItem[];
	readonly totalCount: number;
};

export type TDashboardRepository = {
	readonly [k: symbol]: unknown;
	businessId?: TTenantId;
};
