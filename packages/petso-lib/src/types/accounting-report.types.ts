export interface TCashFlowReportDto {
	readonly inflows: readonly { readonly category: string; readonly amount: number }[];
	readonly outflows: readonly { readonly category: string; readonly amount: number }[];
	readonly totalInflow: number;
	readonly totalOutflow: number;
	readonly netCashFlow: number;
}

export interface TCommissionReportDto {
	readonly staffId: string;
	readonly staffName: string;
	readonly service: string;
	readonly amount: number;
	readonly date: string;
	readonly status: "pending" | "paid";
}
