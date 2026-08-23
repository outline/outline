import type { TExpense } from "./accounting.types";

export const AccountingModule = {
	calculateNetProfit: (revenue: number, expenses: number): number =>
		revenue - expenses,

	calculateMargin: (revenue: number, expenses: number): number =>
		revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,

	reconstituteExpense: (raw: TExpense): TExpense => ({ ...raw }),
} as const;
