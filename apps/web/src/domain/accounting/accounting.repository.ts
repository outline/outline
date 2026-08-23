import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TAttendanceReportEntry,
	TCommissionReportEntry,
	TDashboardMetrics,
	TExpense,
	TFinancialSummary,
} from "./accounting.types";

export class IAccountingRepository extends Context.Tag("IAccountingRepository")<
	IAccountingRepository,
	{
		readonly getDashboardMetrics: (
			tenantId: TTenantId,
		) => Effect.Effect<TDashboardMetrics, DatabaseError>;
		readonly getFinancialSummary: (
			tenantId: TTenantId,
		) => Effect.Effect<TFinancialSummary, DatabaseError>;
		readonly getExpenses: (
			tenantId: TTenantId,
			params: { startDate?: Date; endDate?: Date; category?: string },
		) => Effect.Effect<readonly TExpense[], DatabaseError>;
		readonly saveExpense: (
			expense: TExpense,
		) => Effect.Effect<void, DatabaseError>;
		readonly getPettyCashTransactions: (
			tenantId: TTenantId,
		) => Effect.Effect<
			readonly import("./accounting.types").TPettyCash[],
			DatabaseError
		>;
		readonly savePettyCashTransaction: (
			pettyCash: import("./accounting.types").TPettyCash,
		) => Effect.Effect<void, DatabaseError>;
		readonly getChartOfAccounts: (
			tenantId: TTenantId,
		) => Effect.Effect<
			readonly import("./accounting.types").TAccount[],
			DatabaseError
		>;
		readonly getJournalEntries: (
			tenantId: TTenantId,
		) => Effect.Effect<
			readonly import("./accounting.types").TJournalEntry[],
			DatabaseError
		>;
		readonly saveJournalEntry: (
			journalEntry: import("./accounting.types").TJournalEntry,
		) => Effect.Effect<void, DatabaseError>;
		readonly getProfitLossReport: (
			tenantId: TTenantId,
			startDate: Date,
			endDate: Date,
		) => Effect.Effect<
			import("./accounting.types").TProfitLossReport,
			DatabaseError
		>;
		readonly getCommissionReport: (
			tenantId: TTenantId,
			month?: string,
		) => Effect.Effect<readonly TCommissionReportEntry[], DatabaseError>;
		readonly getAttendanceReport: (
			tenantId: TTenantId,
			month?: string,
		) => Effect.Effect<readonly TAttendanceReportEntry[], DatabaseError>;
		readonly getCashFlowReport: (
			tenantId: TTenantId,
			startDate: Date,
			endDate: Date,
		) => Effect.Effect<
			import("./accounting.types").TCashFlowReport,
			DatabaseError
		>;
	}
>() {}
