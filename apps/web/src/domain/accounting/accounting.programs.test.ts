import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createExpenseProgram,
	getDashboardMetricsProgram,
	getFinancialSummaryProgram,
	getProfitLossReportProgram,
} from "./accounting.programs";
import { IAccountingRepository } from "./accounting.repository";
import type {
	TDashboardMetrics,
	TFinancialSummary,
	TProfitLossReport,
} from "./accounting.types";

describe("AccountingPrograms", () => {
	const tenantId = generateId<TTenantId>();

	describe("getDashboardMetricsProgram", () => {
		it("should call repo.getDashboardMetrics and return result", async () => {
			const getDashboardMetrics = vi.fn().mockReturnValue(
				Effect.succeed({
					activeBoardings: 5,
					completedMonth: 12,
					activeBranches: 2,
					transactionsToday: 8,
					revenueToday: 500000,
					lowStockProducts: 3,
					totalCustomers: 45,
					transactionsGrowth: 10.5,
					revenueGrowth: 15.2,
					volumeData: [],
				} as TDashboardMetrics),
			);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics,
				getFinancialSummary: vi.fn(),
				getExpenses: vi.fn(),
				saveExpense: vi.fn(),
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport: vi.fn(),
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			const program = getDashboardMetricsProgram(tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, repoLayer),
			);

			expect(result.activeBoardings).toBe(5);
			expect(getDashboardMetrics).toHaveBeenCalledWith(tenantId);
		});

		it("should propagate DatabaseError", async () => {
			const getDashboardMetrics = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db down") }),
				);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics,
				getFinancialSummary: vi.fn(),
				getExpenses: vi.fn(),
				saveExpense: vi.fn(),
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport: vi.fn(),
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			const program = getDashboardMetricsProgram(tenantId);
			await expect(
				Effect.runPromise(Effect.provide(program, repoLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getFinancialSummaryProgram", () => {
		it("should call repo.getFinancialSummary and return result", async () => {
			const getFinancialSummary = vi.fn().mockReturnValue(
				Effect.succeed({
					monthlyRevenue: 10000000,
					monthlyExpenses: 4000000,
					monthlyProfit: 6000000,
					pettyCashBalance: 500000,
					revenueTrend: [],
				} as TFinancialSummary),
			);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics: vi.fn(),
				getFinancialSummary,
				getExpenses: vi.fn(),
				saveExpense: vi.fn(),
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport: vi.fn(),
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			const program = getFinancialSummaryProgram(tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, repoLayer),
			);

			expect(result.monthlyProfit).toBe(6000000);
			expect(getFinancialSummary).toHaveBeenCalledWith(tenantId);
		});

		it("should propagate DatabaseError", async () => {
			const getFinancialSummary = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics: vi.fn(),
				getFinancialSummary,
				getExpenses: vi.fn(),
				saveExpense: vi.fn(),
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport: vi.fn(),
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(getFinancialSummaryProgram(tenantId), repoLayer),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("createExpenseProgram", () => {
		const userId = "user-1" as TUserId;

		it("should create expense and return DTO", async () => {
			const saveExpense = vi.fn().mockReturnValue(Effect.void);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics: vi.fn(),
				getFinancialSummary: vi.fn(),
				getExpenses: vi.fn(),
				saveExpense,
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport: vi.fn(),
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			const command = {
				branchId: generateId(),
				category: "Food",
				description: "Pet food",
				amount: 50000,
				expenseDate: new Date("2026-06-10"),
				paymentMethod: "cash",
				receiptUrl: null,
				notes: null,
			};

			const program = createExpenseProgram(command, tenantId, userId);
			const result = await Effect.runPromise(
				Effect.provide(program, repoLayer),
			);

			expect(result.category).toBe("Food");
			expect(result.amount).toBe(50000);
			expect(saveExpense).toHaveBeenCalled();
		});

		it("should propagate DatabaseError when save fails", async () => {
			const saveExpense = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics: vi.fn(),
				getFinancialSummary: vi.fn(),
				getExpenses: vi.fn(),
				saveExpense,
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport: vi.fn(),
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			const command = {
				branchId: generateId(),
				category: "Food",
				description: "Pet food",
				amount: 50000,
				expenseDate: new Date("2026-06-10"),
				paymentMethod: "cash",
				receiptUrl: null,
				notes: null,
			};

			const program = createExpenseProgram(command, tenantId, userId);
			await expect(
				Effect.runPromise(Effect.provide(program, repoLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getProfitLossReportProgram", () => {
		it("should call repo and return mapped report", async () => {
			const getProfitLossReport = vi.fn().mockReturnValue(
				Effect.succeed({
					revenues: [{ category: "Boarding", amount: 5000000 }],
					expenses: [{ category: "Food", amount: 2000000 }],
					totalRevenue: 5000000,
					totalExpense: 2000000,
					netProfit: 3000000,
				} as TProfitLossReport),
			);

			const repoLayer = Layer.succeed(IAccountingRepository, {
				getDashboardMetrics: vi.fn(),
				getFinancialSummary: vi.fn(),
				getExpenses: vi.fn(),
				saveExpense: vi.fn(),
				getPettyCashTransactions: vi.fn(),
				savePettyCashTransaction: vi.fn(),
				getChartOfAccounts: vi.fn(),
				getJournalEntries: vi.fn(),
				saveJournalEntry: vi.fn(),
				getProfitLossReport,
				getCommissionReport: vi.fn(),
				getAttendanceReport: vi.fn(),
				getCashFlowReport: vi.fn(),
			});

			const command = {
				startDate: new Date("2026-06-01"),
				endDate: new Date("2026-06-30"),
			};

			const program = getProfitLossReportProgram(command, tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, repoLayer),
			);

			expect(result.netProfit).toBe(3000000);
			expect(getProfitLossReport).toHaveBeenCalledWith(
				tenantId,
				command.startDate,
				command.endDate,
			);
		});
	});
});
