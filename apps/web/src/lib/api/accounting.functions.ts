import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	CreateExpenseSchema,
	CreateJournalSchema,
	CreatePettyCashSchema,
	createExpenseProgram,
	createJournalEntryProgram,
	createPettyCashProgram,
	getAttendanceReportProgram,
	getCashFlowReportProgram,
	getChartOfAccountsProgram,
	getCommissionReportProgram,
	getDashboardMetricsProgram,
	getExpensesProgram,
	getFinancialSummaryProgram,
	getJournalEntriesProgram,
	getPettyCashProgram,
	getProfitLossReportProgram,
	ProfitLossReportSchema,
} from "@/domain/accounting";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getFinancialSummary = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;
		return await runApp(getFinancialSummaryProgram(businessId as TTenantId));
	});

export const getExpenses = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return { expenses: [], total: 0 };

		const expenses = await runApp(getExpensesProgram(businessId as TTenantId));

		return {
			expenses,
			total: expenses.length,
		};
	});

export const createExpense = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateExpenseSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "accounting:write"));
		return await runApp(createExpenseProgram(data, tenantId, userId));
	});

export const getDashboardMetrics = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;
		return await runApp(getDashboardMetricsProgram(businessId as TTenantId));
	});

export const getPettyCashTransactions = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return { transactions: [], total: 0 };

		const transactions = await runApp(
			getPettyCashProgram(businessId as TTenantId),
		);

		return {
			transactions,
			total: transactions.length,
		};
	});

export const createPettyCashTransaction = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreatePettyCashSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "accounting:write"));
		return await runApp(createPettyCashProgram(data, tenantId, userId));
	});

export const getChartOfAccounts = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return { accounts: [], total: 0 };

		const accounts = await runApp(
			getChartOfAccountsProgram(businessId as TTenantId),
		);

		return {
			accounts,
			total: accounts.length,
		};
	});

export const getJournalEntries = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return { entries: [], total: 0 };

		const entries = await runApp(
			getJournalEntriesProgram(businessId as TTenantId),
		);

		return {
			entries,
			total: entries.length,
		};
	});

export const createJournalEntry = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateJournalSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "accounting:write"));
		return await runApp(createJournalEntryProgram(data, tenantId, userId));
	});

export const getProfitLossReport = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ProfitLossReportSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "accounting:write"));
		return await runApp(getProfitLossReportProgram(data, tenantId));
	});

export const getCommissionReportData = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getCommissionReportProgram(businessId as TTenantId));
	});

export const getAttendanceReportData = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getAttendanceReportProgram(businessId as TTenantId));
	});

export const getCashFlowReport = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId)
			return {
				inflows: [],
				outflows: [],
				totalInflow: 0,
				totalOutflow: 0,
				netCashFlow: 0,
			};
		return await runApp(getCashFlowReportProgram(businessId as TTenantId));
	});

export const accountingApi = {
	getFinancialSummary,
	getExpenses,
	createExpense,
	getDashboardMetrics,
	getPettyCashTransactions,
	createPettyCashTransaction,
	getChartOfAccounts,
	getJournalEntries,
	createJournalEntry,
	getProfitLossReport,
	getCommissionReportData,
	getAttendanceReportData,
	getCashFlowReport,
};
