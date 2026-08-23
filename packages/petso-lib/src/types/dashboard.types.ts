export type TDashboardMetrics = {
	readonly transactionsToday: number;
	readonly revenueToday: number;
	readonly lowStockProducts: number;
	readonly totalCustomers: number;
};

export type TDashboardSummaryDto = {
	readonly metrics: TDashboardMetrics;
	readonly topSellers: readonly unknown[];
	readonly generatedAt: string;
};

export type TLowStockItem = {
	readonly variant: {
		readonly id: string;
		readonly stock: number;
		readonly lowStockThreshold: number;
		readonly deficit: number;
	};
	readonly product: {
		readonly id: string;
		readonly name: string;
		readonly imageUrl: string | null;
	} | null;
};
