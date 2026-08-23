import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	type TAccountDto,
	type TCashFlowReportDto,
	type TDashboardMetricsDto,
	type TExpenseDto,
	type TFinancialSummaryDto,
	type TJournalEntryDto,
	type TPettyCashDto,
	type TProfitLossReportDto,
	toAccountDto,
	toCashFlowReportDto,
	toExpenseDto,
	toJournalEntryDto,
	toPettyCashDto,
	toProfitLossReportDto,
} from "./accounting.dto";
import { IAccountingRepository } from "./accounting.repository";
import type { CreateExpenseCommand } from "./accounting.schemas";
import type {
	TAttendanceReportEntry,
	TCommissionReportEntry,
	TExpense,
	TExpenseId,
} from "./accounting.types";

export const getDashboardMetricsProgram = (
	tenantId: TTenantId,
): Effect.Effect<TDashboardMetricsDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		return yield* repo.getDashboardMetrics(tenantId);
	});

export const getFinancialSummaryProgram = (
	tenantId: TTenantId,
): Effect.Effect<TFinancialSummaryDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		return yield* repo.getFinancialSummary(tenantId);
	});

export const getExpensesProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TExpenseDto[],
	DatabaseError,
	IAccountingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const expenses = yield* repo.getExpenses(tenantId, {});
		return expenses.map(toExpenseDto);
	});

export const createExpenseProgram = (
	command: CreateExpenseCommand,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<TExpenseDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;

		const expense: TExpense = {
			id: generateId() as TExpenseId,
			tenantId,
			branchId: command.branchId as TBranchId,
			category: command.category,
			description: command.description,
			amount: command.amount,
			expenseDate: command.expenseDate,
			paymentMethod: command.paymentMethod,
			receiptUrl: command.receiptUrl,
			notes: command.notes,
			createdBy: userId,
		};

		yield* repo.saveExpense(expense);
		return toExpenseDto(expense);
	});

export const getPettyCashProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TPettyCashDto[],
	DatabaseError,
	IAccountingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const transactions = yield* repo.getPettyCashTransactions(tenantId);
		return transactions.map(toPettyCashDto);
	});

export const createPettyCashProgram = (
	command: import("./accounting.schemas").CreatePettyCashCommand,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<TPettyCashDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;

		const pettyCash: import("./accounting.types").TPettyCash = {
			id: generateId() as import("./accounting.types").TPettyCashId,
			tenantId,
			branchId: command.branchId as TBranchId,
			type: command.type,
			amount: command.amount,
			description: command.description,
			receiptUrl: command.receiptUrl,
			transactionDate: command.transactionDate,
			createdBy: userId,
		};

		yield* repo.savePettyCashTransaction(pettyCash);
		return toPettyCashDto(pettyCash);
	});

export const getChartOfAccountsProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TAccountDto[],
	DatabaseError,
	IAccountingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const accounts = yield* repo.getChartOfAccounts(tenantId);
		return accounts.map(toAccountDto);
	});

export const getJournalEntriesProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TJournalEntryDto[],
	DatabaseError,
	IAccountingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const entries = yield* repo.getJournalEntries(tenantId);
		return entries.map(toJournalEntryDto);
	});

export const createJournalEntryProgram = (
	command: import("./accounting.schemas").CreateJournalCommand,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<TJournalEntryDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const { generateId } = yield* Effect.promise(
			() => import("@/shared/utils"),
		);

		// Determine a simple sequential number or use random hash for entry_number
		const entryNumber = `JE-${Date.now().toString().slice(-6)}`;

		const journalEntry: import("./accounting.types").TJournalEntry = {
			id: generateId() as import("./accounting.types").TJournalEntryId,
			tenantId,
			entryNumber,
			entryDate: command.entryDate,
			description: command.description,
			referenceType: command.referenceType,
			referenceId: command.referenceId,
			status: "posted",
			createdBy: userId,
			lines: command.lines.map((line) => ({
				id: generateId() as import("./accounting.types").TJournalEntryLineId,
				journalEntryId: "" as import("./accounting.types").TJournalEntryId, // Will be overridden in save
				accountId: line.accountId as import("./accounting.types").TAccountId,
				debit: line.debit,
				credit: line.credit,
				description: line.description,
			})),
		};

		// Assign journalEntryId correctly
		const linesWithId = journalEntry.lines.map((line) => ({
			...line,
			journalEntryId: journalEntry.id,
		}));

		const entryToSave = {
			...journalEntry,
			lines: linesWithId,
		};

		yield* repo.saveJournalEntry(entryToSave);
		return toJournalEntryDto(entryToSave);
	});

export const getProfitLossReportProgram = (
	command: import("./accounting.schemas").ProfitLossReportCommand,
	tenantId: TTenantId,
): Effect.Effect<TProfitLossReportDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const report = yield* repo.getProfitLossReport(
			tenantId,
			command.startDate,
			command.endDate,
		);
		return toProfitLossReportDto(report);
	});

export const getCommissionReportProgram = (
	tenantId: TTenantId,
	month?: string,
): Effect.Effect<
	readonly TCommissionReportEntry[],
	DatabaseError,
	IAccountingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		return yield* repo.getCommissionReport(tenantId, month);
	});

export const getAttendanceReportProgram = (
	tenantId: TTenantId,
	month?: string,
): Effect.Effect<
	readonly TAttendanceReportEntry[],
	DatabaseError,
	IAccountingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		return yield* repo.getAttendanceReport(tenantId, month);
	});

export const getCashFlowReportProgram = (
	tenantId: TTenantId,
): Effect.Effect<TCashFlowReportDto, DatabaseError, IAccountingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IAccountingRepository;
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0,
			23,
			59,
			59,
		);
		const report = yield* repo.getCashFlowReport(
			tenantId,
			startOfMonth,
			endOfMonth,
		);
		return toCashFlowReportDto(report);
	});
