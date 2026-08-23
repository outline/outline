import type {
	TBranchId,
	TId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";

export type TAccountId = TId & { readonly _brand: "AccountId" };
export type TJournalEntryId = TId & { readonly _brand: "JournalEntryId" };
export type TJournalEntryLineId = TId & {
	readonly _brand: "JournalEntryLineId";
};
export type TExpenseId = TId & { readonly _brand: "ExpenseId" };
export type TPettyCashId = TId & { readonly _brand: "PettyCashId" };

export const ACCOUNT_TYPE = {
	ASSET: "asset",
	LIABILITY: "liability",
	EQUITY: "equity",
	REVENUE: "revenue",
	EXPENSE: "expense",
} as const;
export type TAccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

export type TAccount = {
	readonly id: TAccountId;
	readonly tenantId: TTenantId;
	readonly code: string;
	readonly name: string;
	readonly type: TAccountType;
	readonly subType: string | null;
	readonly parentId: TAccountId | null;
	readonly description: string | null;
	readonly isActive: boolean;
};

export type TExpense = {
	readonly id: TExpenseId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId | null;
	readonly category: string;
	readonly description: string;
	readonly amount: number;
	readonly expenseDate: Date;
	readonly paymentMethod: string;
	readonly receiptUrl: string | null;
	readonly notes: string | null;
	readonly createdBy: TUserId;
};

export type TPettyCash = {
	readonly id: TPettyCashId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId | null;
	readonly type: "in" | "out";
	readonly amount: number;
	readonly description: string;
	readonly receiptUrl: string | null;
	readonly transactionDate: Date;
	readonly createdBy: TUserId;
};

export type TJournalEntryLine = {
	readonly id: TJournalEntryLineId;
	readonly journalEntryId: TJournalEntryId;
	readonly accountId: TAccountId;
	readonly debit: number;
	readonly credit: number;
	readonly description: string | null;
};

export type TJournalEntry = {
	readonly id: TJournalEntryId;
	readonly tenantId: TTenantId;
	readonly entryNumber: string;
	readonly entryDate: Date;
	readonly description: string | null;
	readonly referenceType: string | null;
	readonly referenceId: string | null;
	readonly status: "draft" | "posted" | "void";
	readonly createdBy: TUserId;
	readonly lines: readonly TJournalEntryLine[];
};

export type TProfitLossReportLine = {
	readonly category: string;
	readonly amount: number;
};

export type TProfitLossReport = {
	readonly revenues: readonly TProfitLossReportLine[];
	readonly expenses: readonly TProfitLossReportLine[];
	readonly totalRevenue: number;
	readonly totalExpense: number;
	readonly netProfit: number;
};

export type TDashboardMetrics = {
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
};

export type TFinancialSummary = {
	readonly monthlyRevenue: number;
	readonly monthlyExpenses: number;
	readonly monthlyProfit: number;
	readonly pettyCashBalance: number;
	readonly revenueTrend: readonly {
		readonly month: string;
		readonly amount: number;
	}[];
};

export type TCommissionReportEntry = {
	readonly staffId: string;
	readonly staffName: string;
	readonly service: string;
	readonly amount: number;
	readonly date: Date;
	readonly status: "pending" | "paid";
};

export type TAttendanceReportEntry = {
	readonly staffId: string;
	readonly staffName: string;
	readonly totalPresent: number;
	readonly totalLate: number;
	readonly totalAbsent: number;
	readonly totalLeave: number;
	readonly expectedDays: number;
};

export type TCashFlowReportLine = {
	readonly category: string;
	readonly amount: number;
};

export type TCashFlowReport = {
	readonly inflows: readonly TCashFlowReportLine[];
	readonly outflows: readonly TCashFlowReportLine[];
	readonly totalInflow: number;
	readonly totalOutflow: number;
	readonly netCashFlow: number;
};
