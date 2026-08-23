import type {
	TDashboardMetrics,
	TExpense,
	TFinancialSummary,
} from "./accounting.types";

export type TDashboardMetricsDto = TDashboardMetrics;
export type TFinancialSummaryDto = TFinancialSummary;

export type TExpenseDto = {
	readonly id: string;
	readonly category: string;
	readonly description: string;
	readonly amount: number;
	readonly expenseDate: string;
	readonly paymentMethod: string;
	readonly receiptUrl: string | null;
};

export const toExpenseDto = (expense: TExpense): TExpenseDto => ({
	id: expense.id,
	category: expense.category,
	description: expense.description,
	amount: expense.amount,
	expenseDate: expense.expenseDate.toISOString(),
	paymentMethod: expense.paymentMethod,
	receiptUrl: expense.receiptUrl,
});

export type TPettyCashDto = {
	readonly id: string;
	readonly type: "in" | "out";
	readonly amount: number;
	readonly description: string;
	readonly transactionDate: string;
	readonly receiptUrl: string | null;
};

export const toPettyCashDto = (
	pettyCash: import("./accounting.types").TPettyCash,
): TPettyCashDto => ({
	id: pettyCash.id,
	type: pettyCash.type,
	amount: pettyCash.amount,
	description: pettyCash.description,
	transactionDate: pettyCash.transactionDate.toISOString(),
	receiptUrl: pettyCash.receiptUrl,
});

export type TAccountDto = {
	readonly id: string;
	readonly code: string;
	readonly name: string;
	readonly type: string;
	readonly subType: string | null;
	readonly description: string | null;
	readonly isActive: boolean;
};

export const toAccountDto = (
	account: import("./accounting.types").TAccount,
): TAccountDto => ({
	id: account.id,
	code: account.code,
	name: account.name,
	type: account.type,
	subType: account.subType,
	description: account.description,
	isActive: account.isActive,
});

export type TJournalEntryLineDto = {
	readonly id: string;
	readonly accountId: string;
	readonly account?: TAccountDto;
	readonly debit: number;
	readonly credit: number;
	readonly description: string | null;
};

export type TJournalEntryDto = {
	readonly id: string;
	readonly entryNumber: string;
	readonly entryDate: string;
	readonly description: string | null;
	readonly referenceType: string | null;
	readonly referenceId: string | null;
	readonly status: string;
	readonly lines: readonly TJournalEntryLineDto[];
};

export const toJournalEntryDto = (
	entry: import("./accounting.types").TJournalEntry,
): TJournalEntryDto => ({
	id: entry.id,
	entryNumber: entry.entryNumber,
	entryDate: entry.entryDate.toISOString(),
	description: entry.description,
	referenceType: entry.referenceType,
	referenceId: entry.referenceId,
	status: entry.status,
	lines: entry.lines.map((line) => ({
		id: line.id,
		accountId: line.accountId,
		debit: line.debit,
		credit: line.credit,
		description: line.description,
	})),
});

export type TProfitLossReportDto = {
	readonly revenues: readonly { category: string; amount: number }[];
	readonly expenses: readonly { category: string; amount: number }[];
	readonly totalRevenue: number;
	readonly totalExpense: number;
	readonly netProfit: number;
};

export const toProfitLossReportDto = (
	report: import("./accounting.types").TProfitLossReport,
): TProfitLossReportDto => ({
	revenues: report.revenues,
	expenses: report.expenses,
	totalRevenue: report.totalRevenue,
	totalExpense: report.totalExpense,
	netProfit: report.netProfit,
});

export type TCashFlowReportDto = {
	readonly inflows: readonly { category: string; amount: number }[];
	readonly outflows: readonly { category: string; amount: number }[];
	readonly totalInflow: number;
	readonly totalOutflow: number;
	readonly netCashFlow: number;
};

export const toCashFlowReportDto = (
	report: import("./accounting.types").TCashFlowReport,
): TCashFlowReportDto => ({
	inflows: report.inflows,
	outflows: report.outflows,
	totalInflow: report.totalInflow,
	totalOutflow: report.totalOutflow,
	netCashFlow: report.netCashFlow,
});
