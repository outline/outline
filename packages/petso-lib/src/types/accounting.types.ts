export interface TAccountingDashboardMetricsDto {
	readonly activeBoardings: number;
	readonly completedMonth: number;
	readonly activeBranches: number;
	readonly transactionsToday: number;
	readonly revenueToday: number;
	readonly lowStockProducts: number;
	readonly totalCustomers: number;
	readonly transactionsGrowth: number;
	readonly revenueGrowth: number;
	readonly volumeData: readonly {
		readonly day: string;
		readonly count: number;
		readonly active: boolean;
	}[];
}
