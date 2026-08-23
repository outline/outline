import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	boardings,
	branches,
	chartOfAccounts,
	commissionRecords,
	customers,
	expenses,
	journalEntries,
	journalEntryLines,
	orders,
	pettyCash,
	products,
	profiles,
	purchaseOrders,
	staffAttendances,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { DateUtils, withRetry } from "@/shared/utils";
import { IAccountingRepository } from "./accounting.repository";
import type {
	TAccount,
	TAccountId,
	TAccountType,
	TAttendanceReportEntry,
	TCashFlowReport,
	TCommissionReportEntry,
	TExpense,
	TExpenseId,
	TFinancialSummary,
	TJournalEntry,
	TJournalEntryId,
	TJournalEntryLineId,
	TPettyCash,
	TPettyCashId,
	TProfitLossReport,
} from "./accounting.types";

type TChartOfAccountsRow = typeof chartOfAccounts.$inferSelect;
type TJournalEntryRow = typeof journalEntries.$inferSelect;
type TJournalEntryLineRow = typeof journalEntryLines.$inferSelect;
type TExpenseRow = typeof expenses.$inferSelect;
type TPettyCashRow = typeof pettyCash.$inferSelect;
type TCommissionRecordRow = typeof commissionRecords.$inferSelect;
type TStaffAttendanceRow = typeof staffAttendances.$inferSelect;
type TProfileRow = typeof profiles.$inferSelect;

const mapAccountRow = (row: TChartOfAccountsRow): TAccount => ({
	id: row.id as TAccountId,
	tenantId: row.businessId as TTenantId,
	code: row.code,
	name: row.name,
	type: row.type as TAccountType,
	subType: row.subType,
	parentId: row.parentId as TAccountId | null,
	description: row.description,
	isActive: row.isActive ?? true,
});

const mapLineRow = (
	row: TJournalEntryLineRow,
): {
	readonly id: TJournalEntryLineId;
	readonly journalEntryId: TJournalEntryId;
	readonly accountId: TAccountId;
	readonly debit: number;
	readonly credit: number;
	readonly description: string | null;
} => ({
	id: row.id as TJournalEntryLineId,
	journalEntryId: row.journalEntryId as TJournalEntryId,
	accountId: row.accountId as TAccountId,
	debit: Number(row.debit),
	credit: Number(row.credit),
	description: row.description,
});

const mapJournalEntryRow = (
	row: TJournalEntryRow,
	lines: readonly {
		readonly id: TJournalEntryLineId;
		readonly journalEntryId: TJournalEntryId;
		readonly accountId: TAccountId;
		readonly debit: number;
		readonly credit: number;
		readonly description: string | null;
	}[],
): TJournalEntry => ({
	id: row.id as TJournalEntryId,
	tenantId: row.businessId as TTenantId,
	entryNumber: row.entryNumber,
	entryDate: new Date(row.entryDate),
	description: row.description,
	referenceType: row.referenceType,
	referenceId: row.referenceId,
	status: row.status as TJournalEntry["status"],
	createdBy: (row.createdBy ?? "") as TJournalEntry["createdBy"],
	lines,
});

const mapExpenseRow = (row: TExpenseRow): TExpense => ({
	id: row.id as TExpenseId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId as TExpense["branchId"],
	category: row.category,
	description: row.description,
	amount: Number(row.amount),
	expenseDate: new Date(row.expenseDate),
	paymentMethod: row.paymentMethod ?? "",
	receiptUrl: row.receiptUrl,
	notes: row.notes,
	createdBy: (row.createdBy ?? "") as TExpense["createdBy"],
});

const mapPettyCashRow = (row: TPettyCashRow): TPettyCash => ({
	id: row.id as TPettyCashId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId as TPettyCash["branchId"],
	type: row.type as "in" | "out",
	amount: Number(row.amount),
	description: row.description,
	receiptUrl: row.receiptUrl,
	transactionDate: new Date(row.transactionDate),
	createdBy: (row.createdBy ?? "") as TPettyCash["createdBy"],
});

const toShortDate = (date: Date): string => DateUtils.toShortDate(date);
const toIso = (date: Date): string => DateUtils.formatISO(date);

export const AccountingRepositoryDrizzle = Layer.effect(
	IAccountingRepository,
	Effect.map(IDrizzleClient, (db) =>
		IAccountingRepository.of({
			getDashboardMetrics: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const startOfMonth = DateUtils.startOfMonth();
							const startOfDay = DateUtils.startOfDay();

							const [
								activeBoardingsRow,
								completedMonthRow,
								activeBranchesRow,
								todayOrdersRows,
								lowStockRow,
								totalCustomersRow,
							] = await Promise.all([
								db
									.select({ count: sql<number>`COUNT(*)::int` })
									.from(boardings)
									.where(
										and(
											eq(boardings.businessId, tenantId),
											eq(boardings.status, "active"),
										),
									),
								db
									.select({ count: sql<number>`COUNT(*)::int` })
									.from(boardings)
									.where(
										and(
											eq(boardings.businessId, tenantId),
											eq(boardings.status, "completed"),
											gte(boardings.createdAt, toIso(startOfMonth)),
										),
									),
								db
									.select({ count: sql<number>`COUNT(*)::int` })
									.from(branches)
									.where(
										and(
											eq(branches.businessId, tenantId),
											eq(branches.isActive, true),
										),
									),
								db
									.select({ totalAmount: orders.totalAmount })
									.from(orders)
									.where(
										and(
											eq(orders.businessId, tenantId),
											gte(orders.createdAt, toIso(startOfDay)),
										),
									),
								db
									.select({ count: sql<number>`COUNT(*)::int` })
									.from(products)
									.where(
										and(
											eq(products.businessId, tenantId),
											sql`${products.stock} <= 5`,
										),
									),
								db
									.select({ count: sql<number>`COUNT(*)::int` })
									.from(customers)
									.where(eq(customers.businessId, tenantId)),
							]);

							const transactionsToday = todayOrdersRows.length;
							const revenueToday = todayOrdersRows.reduce(
								(sum, o) => sum + Number(o.totalAmount ?? 0),
								0,
							);

							const yesterday = new Date(startOfDay);
							yesterday.setDate(yesterday.getDate() - 1);
							const yesterdayRows = await db
								.select({ totalAmount: orders.totalAmount })
								.from(orders)
								.where(
									and(
										eq(orders.businessId, tenantId),
										gte(orders.createdAt, toIso(yesterday)),
										lte(orders.createdAt, toIso(startOfDay)),
									),
								);

							const yesterdayTransactions = yesterdayRows.length;
							const yesterdayRevenue = yesterdayRows.reduce(
								(sum, o) => sum + Number(o.totalAmount ?? 0),
								0,
							);

							const transactionsGrowth =
								yesterdayTransactions > 0
									? ((transactionsToday - yesterdayTransactions) /
											yesterdayTransactions) *
										100
									: transactionsToday > 0
										? 100
										: 0;

							const revenueGrowth =
								yesterdayRevenue > 0
									? ((revenueToday - yesterdayRevenue) / yesterdayRevenue) * 100
									: revenueToday > 0
										? 100
										: 0;

							const volumeData: {
								day: string;
								count: number;
								active: boolean;
							}[] = [];
							const dayNames = [
								"Sun",
								"Mon",
								"Tue",
								"Wed",
								"Thu",
								"Fri",
								"Sat",
							];
							const today = new Date();

							for (let i = 10; i >= 0; i--) {
								const date = new Date(today);
								date.setDate(date.getDate() - i);
								const dayStart = new Date(date);
								dayStart.setHours(0, 0, 0, 0);
								const dayEnd = new Date(date);
								dayEnd.setHours(23, 59, 59, 999);

								const countRow = await db
									.select({ count: sql<number>`COUNT(*)::int` })
									.from(orders)
									.where(
										and(
											eq(orders.businessId, tenantId),
											gte(orders.createdAt, toIso(dayStart)),
											lte(orders.createdAt, toIso(dayEnd)),
										),
									);

								volumeData.push({
									day: dayNames[date.getDay()] ?? "Unknown",
									count: Number(countRow[0]?.count ?? 0),
									active: i === 0,
								});
							}

							return {
								activeBoardings: Number(activeBoardingsRow[0]?.count ?? 0),
								completedMonth: Number(completedMonthRow[0]?.count ?? 0),
								activeBranches: Number(activeBranchesRow[0]?.count ?? 0),
								transactionsToday,
								revenueToday,
								lowStockProducts: Number(lowStockRow[0]?.count ?? 0),
								totalCustomers: Number(totalCustomersRow[0]?.count ?? 0),
								transactionsGrowth: Math.round(transactionsGrowth * 10) / 10,
								revenueGrowth: Math.round(revenueGrowth * 10) / 10,
								volumeData,
							};
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getFinancialSummary: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const now = DateUtils.now();
							const startOfMonth = DateUtils.startOfMonth();
							const startOfMonthIso = toIso(startOfMonth);

							const monthlyOrderRows = await db
								.select({
									totalAmount: orders.totalAmount,
									createdAt: orders.createdAt,
								})
								.from(orders)
								.where(
									and(
										eq(orders.businessId, tenantId),
										gte(orders.createdAt, startOfMonthIso),
									),
								);

							const monthlyExpenseRows = await db
								.select({ amount: expenses.amount })
								.from(expenses)
								.where(
									and(
										eq(expenses.businessId, tenantId),
										gte(expenses.expenseDate, toShortDate(startOfMonth)),
									),
								);

							const pettyCashRows = await db
								.select({ type: pettyCash.type, amount: pettyCash.amount })
								.from(pettyCash)
								.where(eq(pettyCash.businessId, tenantId));

							const monthlyRevenue = monthlyOrderRows.reduce(
								(sum, o) => sum + Number(o.totalAmount),
								0,
							);
							const monthlyExpenseTotal = monthlyExpenseRows.reduce(
								(sum, e) => sum + Number(e.amount),
								0,
							);
							const pettyCashBalance = pettyCashRows.reduce((sum, t) => {
								const amt = Number(t.amount);
								return sum + (t.type === "in" ? amt : -amt);
							}, 0);

							const monthNames = [
								"Jan",
								"Feb",
								"Mar",
								"Apr",
								"Mei",
								"Jun",
								"Jul",
								"Ags",
								"Sep",
								"Okt",
								"Nov",
								"Des",
							];
							const revenueTrend: { month: string; amount: number }[] = [];

							for (let i = 5; i >= 0; i--) {
								const monthStart = new Date(
									now.getFullYear(),
									now.getMonth() - i,
									1,
								);
								const monthEnd = new Date(
									now.getFullYear(),
									now.getMonth() - i + 1,
									0,
									23,
									59,
									59,
									999,
								);

								const monthRevenue = monthlyOrderRows.reduce((sum, o) => {
									const d = new Date(o.createdAt ?? new Date());
									return d >= monthStart && d <= monthEnd
										? sum + Number(o.totalAmount)
										: sum;
								}, 0);

								revenueTrend.push({
									month: monthNames[monthStart.getMonth()] ?? "Unknown",
									amount: monthRevenue,
								});
							}

							const result: TFinancialSummary = {
								monthlyRevenue,
								monthlyExpenses: monthlyExpenseTotal,
								monthlyProfit: monthlyRevenue - monthlyExpenseTotal,
								pettyCashBalance,
								revenueTrend,
							};
							return result;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getExpenses: (
				tenantId: TTenantId,
				params: { startDate?: Date; endDate?: Date; category?: string },
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const conditions = [eq(expenses.businessId, tenantId)];
							if (params.startDate) {
								conditions.push(
									gte(expenses.expenseDate, toIso(params.startDate)),
								);
							}
							if (params.endDate) {
								conditions.push(
									lte(expenses.expenseDate, toIso(params.endDate)),
								);
							}
							if (params.category) {
								conditions.push(eq(expenses.category, params.category));
							}

							const rows = await db
								.select()
								.from(expenses)
								.where(and(...conditions))
								.orderBy(desc(expenses.expenseDate));
							return rows.map(mapExpenseRow);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			saveExpense: (expense: TExpense) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(expenses).values({
								id: expense.id as unknown as string,
								businessId: expense.tenantId,
								branchId: expense.branchId as unknown as string | null,
								category: expense.category,
								description: expense.description,
								amount: String(expense.amount),
								expenseDate: toShortDate(expense.expenseDate),
								paymentMethod: expense.paymentMethod,
								receiptUrl: expense.receiptUrl,
								notes: expense.notes,
								createdBy: expense.createdBy as unknown as string,
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getPettyCashTransactions: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(pettyCash)
								.where(eq(pettyCash.businessId, tenantId))
								.orderBy(desc(pettyCash.transactionDate));
							return rows.map(mapPettyCashRow);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			savePettyCashTransaction: (pettyCashTransaction: TPettyCash) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(pettyCash).values({
								id: pettyCashTransaction.id as unknown as string,
								businessId: pettyCashTransaction.tenantId,
								branchId: pettyCashTransaction.branchId as unknown as
									| string
									| null,
								type: pettyCashTransaction.type,
								amount: String(pettyCashTransaction.amount),
								description: pettyCashTransaction.description,
								receiptUrl: pettyCashTransaction.receiptUrl,
								transactionDate: toShortDate(
									pettyCashTransaction.transactionDate,
								),
								createdBy: pettyCashTransaction.createdBy as unknown as string,
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getChartOfAccounts: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(chartOfAccounts)
								.where(eq(chartOfAccounts.businessId, tenantId))
								.orderBy(asc(chartOfAccounts.code));
							return rows.map(mapAccountRow);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getJournalEntries: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const entryRows = await db
								.select()
								.from(journalEntries)
								.where(eq(journalEntries.businessId, tenantId))
								.orderBy(desc(journalEntries.entryDate));

							if (entryRows.length === 0) return [];

							const entryIds = entryRows.map((r) => r.id as unknown as string);
							const lineRows = await db
								.select()
								.from(journalEntryLines)
								.where(inArray(journalEntryLines.journalEntryId, entryIds));

							const linesByEntry = new Map<string, TJournalEntryLineRow[]>();
							for (const line of lineRows) {
								const id = line.journalEntryId as unknown as string;
								const existing = linesByEntry.get(id) ?? [];
								existing.push(line);
								linesByEntry.set(id, existing);
							}

							return entryRows.map((row) =>
								mapJournalEntryRow(
									row,
									(linesByEntry.get(row.id as unknown as string) ?? []).map(
										mapLineRow,
									),
								),
							);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			saveJournalEntry: (journalEntry: TJournalEntry) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// Port of `public.atomic_save_journal_entry`.
							// The RPC inserts the header + all lines in a single
							// Postgres transaction; we use db.transaction() so the
							// call stays atomic. If any line INSERT fails the header
							// rolls back too — no orphan entries that break the books.
							await db.transaction(async (tx) => {
								await tx.insert(journalEntries).values({
									id: journalEntry.id as unknown as string,
									businessId: journalEntry.tenantId,
									entryNumber: journalEntry.entryNumber,
									entryDate: toShortDate(journalEntry.entryDate),
									description: journalEntry.description,
									referenceType: journalEntry.referenceType,
									referenceId: journalEntry.referenceId as unknown as
										| string
										| null,
									status: journalEntry.status,
									createdBy: journalEntry.createdBy as unknown as string,
								});

								if (journalEntry.lines.length > 0) {
									await tx.insert(journalEntryLines).values(
										journalEntry.lines.map((line) => ({
											id: line.id as unknown as string,
											journalEntryId: journalEntry.id as unknown as string,
											accountId: line.accountId as unknown as string,
											debit: String(line.debit),
											credit: String(line.credit),
											description: line.description,
										})),
									);
								}
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getProfitLossReport: (
				tenantId: TTenantId,
				startDate: Date,
				endDate: Date,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const startIso = toIso(startDate);
							const endIso = toIso(endDate);
							const startShort = toShortDate(startDate);
							const endShort = toShortDate(endDate);

							const orderRows = await db
								.select({ totalAmount: orders.totalAmount })
								.from(orders)
								.where(
									and(
										eq(orders.businessId, tenantId),
										gte(orders.createdAt, startIso),
										lte(orders.createdAt, endIso),
									),
								);

							const orderRevenue = orderRows.reduce(
								(sum, o) => sum + Number(o.totalAmount),
								0,
							);

							const expenseRows = await db
								.select({
									category: expenses.category,
									amount: expenses.amount,
								})
								.from(expenses)
								.where(
									and(
										eq(expenses.businessId, tenantId),
										gte(expenses.expenseDate, startShort),
										lte(expenses.expenseDate, endShort),
									),
								);

							const expenseMap = new Map<string, number>();
							for (const exp of expenseRows) {
								const cat = exp.category || "Uncategorized";
								expenseMap.set(
									cat,
									(expenseMap.get(cat) ?? 0) + Number(exp.amount),
								);
							}

							const revenues = [
								{
									category: "Layanan Penitipan & Produk",
									amount: orderRevenue,
								},
							];
							const expenseLines = Array.from(expenseMap.entries()).map(
								([category, amount]) => ({ category, amount }),
							);
							const totalRevenue = orderRevenue;
							const totalExpense = expenseLines.reduce(
								(sum, e) => sum + e.amount,
								0,
							);

							const report: TProfitLossReport = {
								revenues,
								expenses: expenseLines,
								totalRevenue,
								totalExpense,
								netProfit: totalRevenue - totalExpense,
							};
							return report;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getCommissionReport: (tenantId: TTenantId, month?: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const conditions = [eq(commissionRecords.businessId, tenantId)];
							if (month) {
								const startOfMonth = `${month}-01`;
								const parts = month.split("-").map(Number);
								const y = parts[0] ?? new Date().getFullYear();
								const m = parts[1] ?? new Date().getMonth() + 1;
								const lastDay = new Date(y, m, 0).getDate();
								const endOfMonth = `${month}-${String(lastDay).padStart(2, "0")}`;
								conditions.push(
									gte(commissionRecords.createdAt, `${startOfMonth}T00:00:00`),
								);
								conditions.push(
									lte(commissionRecords.createdAt, `${endOfMonth}T23:59:59`),
								);
							}

							const rows = await db
								.select()
								.from(commissionRecords)
								.where(and(...conditions))
								.orderBy(desc(commissionRecords.createdAt));

							if (rows.length === 0) return [];

							const staffIds = [
								...new Set(rows.map((r) => r.staffId as unknown as string)),
							];
							const profileRows = await db
								.select({
									userId: profiles.userId,
									fullName: profiles.fullName,
								})
								.from(profiles)
								.where(inArray(profiles.userId, staffIds));

							const nameMap = new Map<string, string>();
							for (const p of profileRows) {
								nameMap.set(p.userId as unknown as string, p.fullName);
							}

							return rows.map((r: TCommissionRecordRow) => ({
								staffId: r.staffId as unknown as string,
								staffName:
									nameMap.get(r.staffId as unknown as string) ??
									(r.staffId as unknown as string),
								service: r.referenceType,
								amount: Number(r.amount),
								date: new Date(r.createdAt ?? new Date().toISOString()),
								status: r.status as "pending" | "paid",
							})) as readonly TCommissionReportEntry[];
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getAttendanceReport: (tenantId: TTenantId, month?: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const nowParts = new Date()
								.toISOString()
								.slice(0, 7)
								.split("-")
								.map(Number);
							const defaultY = nowParts[0] ?? new Date().getFullYear();
							const defaultM = nowParts[1] ?? new Date().getMonth() + 1;
							const startDate = month
								? `${month}-01`
								: `${String(defaultY)}-${String(defaultM).padStart(2, "0")}-01`;
							const monthParts = startDate.slice(0, 7).split("-").map(Number);
							const y = monthParts[0] ?? defaultY;
							const m = monthParts[1] ?? defaultM;
							const lastDay = new Date(y, m, 0).getDate();
							const endDate = `${startDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;

							const attendanceRows = await db
								.select({
									staffId: staffAttendances.staffId,
									clockIn: staffAttendances.clockIn,
									notes: staffAttendances.notes,
								})
								.from(staffAttendances)
								.where(
									and(
										eq(staffAttendances.businessId, tenantId),
										gte(staffAttendances.date, startDate),
										lte(staffAttendances.date, endDate),
									),
								);

							const profileRows = await db
								.select({
									userId: profiles.userId,
									fullName: profiles.fullName,
								})
								.from(profiles)
								.where(
									and(
										eq(profiles.businessId, tenantId),
										eq(profiles.isActive, true),
									),
								);

							const attendanceByStaff = new Map<
								string,
								Pick<TStaffAttendanceRow, "staffId" | "clockIn" | "notes">[]
							>();
							for (const rec of attendanceRows) {
								const sid = rec.staffId as unknown as string;
								const existing = attendanceByStaff.get(sid) ?? [];
								existing.push(rec);
								attendanceByStaff.set(sid, existing);
							}

							const weekdays = Array.from(
								{ length: lastDay },
								(_, i) => i + 1,
							).filter((d) => {
								const date = new Date(y, m - 1, d);
								return date.getDay() !== 0 && date.getDay() !== 6;
							}).length;

							return (
								profileRows as Pick<TProfileRow, "userId" | "fullName">[]
							).map((p) => {
								const sid = p.userId as unknown as string;
								const records = attendanceByStaff.get(sid) ?? [];
								const present = records.filter((r) => r.clockIn).length;
								const leave = records.filter(
									(r) =>
										r.notes?.toLowerCase().includes("cuti") ||
										r.notes?.toLowerCase().includes("izin"),
								).length;
								const late = records.filter((r) => {
									if (!r.clockIn) return false;
									return r.clockIn.slice(11, 16) > "09:00";
								}).length;
								const presentWithoutLate = present - late - leave;
								const absent = weekdays - presentWithoutLate - late - leave;

								const entry: TAttendanceReportEntry = {
									staffId: sid,
									staffName: p.fullName,
									totalPresent: Math.max(0, presentWithoutLate),
									totalLate: late,
									totalAbsent: Math.max(0, absent),
									totalLeave: leave,
									expectedDays: weekdays,
								};
								return entry;
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getCashFlowReport: (
				tenantId: TTenantId,
				startDate: Date,
				endDate: Date,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const startStr = toIso(startDate);
							const endStr = toIso(endDate);

							const [posOrdersRows, bookingRows, poRows, pcRows, expenseRows] =
								await Promise.all([
									db
										.select({ totalAmount: orders.totalAmount })
										.from(orders)
										.where(
											and(
												eq(orders.businessId, tenantId),
												eq(orders.status, "completed"),
												gte(orders.createdAt, startStr),
												lte(orders.createdAt, endStr),
											),
										),
									db
										.select({ totalAmount: boardings.totalAmount })
										.from(boardings)
										.where(
											and(
												eq(boardings.businessId, tenantId),
												eq(boardings.status, "completed"),
												gte(boardings.createdAt, startStr),
												lte(boardings.createdAt, endStr),
											),
										),
									db
										.select({ totalAmount: purchaseOrders.totalAmount })
										.from(purchaseOrders)
										.where(
											and(
												eq(purchaseOrders.businessId, tenantId),
												gte(purchaseOrders.createdAt, startStr),
												lte(purchaseOrders.createdAt, endStr),
											),
										),
									db
										.select({ amount: pettyCash.amount })
										.from(pettyCash)
										.where(
											and(
												eq(pettyCash.businessId, tenantId),
												eq(pettyCash.type, "out"),
												gte(pettyCash.createdAt, startStr),
												lte(pettyCash.createdAt, endStr),
											),
										),
									db
										.select({ amount: expenses.amount })
										.from(expenses)
										.where(
											and(
												eq(expenses.businessId, tenantId),
												gte(expenses.expenseDate, startStr),
												lte(expenses.expenseDate, endStr),
											),
										),
								]);

							const posRevenue = posOrdersRows.reduce(
								(s, o) => s + Number(o.totalAmount ?? 0),
								0,
							);
							const bookingRevenue = bookingRows.reduce(
								(s, b) => s + Number(b.totalAmount ?? 0),
								0,
							);
							const supplierPayments = poRows.reduce(
								(s, p) => s + Number(p.totalAmount ?? 0),
								0,
							);
							const pettyCashOut = pcRows.reduce(
								(s, p) => s + Number(p.amount ?? 0),
								0,
							);
							const salaryExpenses = expenseRows.reduce(
								(s, e) => s + Number(e.amount ?? 0),
								0,
							);

							const inflows = [
								{ category: "Penerimaan POS / Kasir", amount: posRevenue },
								{
									category: "Penerimaan Booking Pet Hotel",
									amount: bookingRevenue,
								},
							];
							const outflows = [
								{
									category: "Pembayaran Supplier (PO)",
									amount: supplierPayments,
								},
								{
									category: "Pengeluaran Operasional (Petty Cash)",
									amount: pettyCashOut,
								},
								{
									category: "Pembayaran Gaji & Komisi",
									amount: salaryExpenses,
								},
							];
							const totalInflow = inflows.reduce((s, i) => s + i.amount, 0);
							const totalOutflow = outflows.reduce((s, i) => s + i.amount, 0);

							const report: TCashFlowReport = {
								inflows,
								outflows,
								totalInflow,
								totalOutflow,
								netCashFlow: totalInflow - totalOutflow,
							};
							return report;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
		}),
	),
);
