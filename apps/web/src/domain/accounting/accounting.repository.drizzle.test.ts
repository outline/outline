// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IAccountingRepository } from "./accounting.repository";
import { AccountingRepositoryDrizzle } from "./accounting.repository.drizzle";
import type {
	TAccountId,
	TExpenseId,
	TJournalEntryId,
	TJournalEntryLineId,
	TPettyCashId,
} from "./accounting.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const accountingRepoLayer = Layer.provide(
	AccountingRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(
	effect: Effect.Effect<A, E, IAccountingRepository>,
): Promise<A> => Effect.runPromise(Effect.provide(effect, accountingRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = (): Promise<DrizzleClient> =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

describe.skipIf(!hasDb)("accounting repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const ownerId = generateId<string>();
	const prefix = `__smoke_acc_${Date.now()}`;
	const ownerEmail = `${prefix}_owner@example.com`;
	const userId = generateId<TUserId>();
	const userEmail = `${prefix}_user@example.com`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(sql`
			INSERT INTO users (id, email, password_hash)
			VALUES (${ownerId}, ${ownerEmail}, 'pw')
			ON CONFLICT (email) DO NOTHING
		`);
		await db.execute(sql`
			INSERT INTO users (id, email, password_hash)
			VALUES (${userId}, ${userEmail}, 'pw')
			ON CONFLICT (email) DO NOTHING
		`);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix} Business`}, ${ownerId}) ON CONFLICT (id) DO NOTHING`,
		);
		await db.execute(sql`
			INSERT INTO profiles (user_id, business_id, full_name, email, is_active)
			VALUES (${userId}, ${tenantId}, ${`${prefix} User`}, ${userEmail}, true)
			ON CONFLICT (user_id) DO NOTHING
		`);
	}, 20000);

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE business_id = ${tenantId}::uuid)`,
		);
		await db.execute(
			sql`DELETE FROM journal_entries WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM chart_of_accounts WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM expenses WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM petty_cash WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM profiles WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}::uuid`);
		await db.execute(sql`DELETE FROM users WHERE email = ${userEmail}`);
		await db.execute(sql`DELETE FROM users WHERE email = ${ownerEmail}`);
	});

	it("saves and lists expenses filtered by tenant", async () => {
		const expenseId = generateId<TExpenseId>();
		const expenseUuid = expenseId as unknown as string;

		await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveExpense({
						id: expenseId,
						tenantId,
						branchId: null,
						category: "operational",
						description: `${prefix} expense`,
						amount: 1000,
						expenseDate: new Date(),
						paymentMethod: "cash",
						receiptUrl: null,
						notes: null,
						createdBy: userId,
					}),
				),
			),
		);

		const expenses = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) => repo.getExpenses(tenantId, {})),
			),
		);
		const mine = expenses.find((e) => e.id === expenseId);
		expect(mine).toBeDefined();
		expect(mine?.category).toBe("operational");
		expect(mine?.amount).toBe(1000);

		// filtered by category
		const cat = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.getExpenses(tenantId, { category: "operational" }),
				),
			),
		);
		expect(cat.some((e) => e.id === expenseId)).toBe(true);

		// wrong category → empty for this row
		const wrong = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.getExpenses(tenantId, { category: "not_a_category" }),
				),
			),
		);
		expect(wrong.some((e) => e.id === expenseId)).toBe(false);

		void expenseUuid;
	}, 20000);

	it("saves and lists petty cash transactions filtered by tenant", async () => {
		const pettyId = generateId<TPettyCashId>();

		await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.savePettyCashTransaction({
						id: pettyId,
						tenantId,
						branchId: null,
						type: "in",
						amount: 500,
						description: `${prefix} top up`,
						receiptUrl: null,
						transactionDate: new Date(),
						createdBy: userId,
					}),
				),
			),
		);

		const list = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) => repo.getPettyCashTransactions(tenantId)),
			),
		);
		const mine = list.find((t) => t.id === pettyId);
		expect(mine).toBeDefined();
		expect(mine?.type).toBe("in");
		expect(mine?.amount).toBe(500);
	}, 20000);

	it("saves and lists chart of accounts", async () => {
		const accountId = generateId<TAccountId>();
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO chart_of_accounts (id, business_id, code, name, type, is_active) VALUES (${accountId as unknown as string}, ${tenantId}, ${`${prefix}-001`}, ${`${prefix} Cash`}, 'asset', true)`,
		);

		const list = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) => repo.getChartOfAccounts(tenantId)),
			),
		);
		const mine = list.find((a) => a.id === accountId);
		expect(mine).toBeDefined();
		expect(mine?.code).toBe(`${prefix}-001`);
		expect(mine?.name).toBe(`${prefix} Cash`);
		expect(mine?.type).toBe("asset");
		expect(mine?.isActive).toBe(true);
	}, 15000);

	it("saveJournalEntry (RPC port) inserts entry + lines atomically", async () => {
		const accountAId = generateId<TAccountId>();
		const accountBId = generateId<TAccountId>();
		const entryId = generateId<TJournalEntryId>();
		const lineAId = generateId<TJournalEntryLineId>();
		const lineBId = generateId<TJournalEntryLineId>();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO chart_of_accounts (id, business_id, code, name, type, is_active) VALUES (${accountAId as unknown as string}, ${tenantId}, ${`${prefix}-COA-A`}, ${`${prefix} A`}, 'asset', true)`,
		);
		await db.execute(
			sql`INSERT INTO chart_of_accounts (id, business_id, code, name, type, is_active) VALUES (${accountBId as unknown as string}, ${tenantId}, ${`${prefix}-COA-B`}, ${`${prefix} B`}, 'revenue', true)`,
		);

		await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveJournalEntry({
						id: entryId,
						tenantId,
						entryNumber: `${prefix}-JE-1`,
						entryDate: new Date(),
						description: `${prefix} balanced entry`,
						referenceType: null,
						referenceId: null,
						status: "posted",
						createdBy: userId,
						lines: [
							{
								id: lineAId,
								journalEntryId: entryId,
								accountId: accountAId,
								debit: 2500,
								credit: 0,
								description: null,
							},
							{
								id: lineBId,
								journalEntryId: entryId,
								accountId: accountBId,
								debit: 0,
								credit: 2500,
								description: null,
							},
						],
					}),
				),
			),
		);

		const entries = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) => repo.getJournalEntries(tenantId)),
			),
		);
		const mine = entries.find((e) => e.id === entryId);
		expect(mine).toBeDefined();
		expect(mine?.entryNumber).toBe(`${prefix}-JE-1`);
		expect(mine?.lines.length).toBe(2);
		expect(mine?.status).toBe("posted");
		const totalDebit = mine?.lines.reduce((s, l) => s + l.debit, 0) ?? 0;
		const totalCredit = mine?.lines.reduce((s, l) => s + l.credit, 0) ?? 0;
		expect(totalDebit).toBe(2500);
		expect(totalCredit).toBe(2500);
	}, 20000);

	it("saveJournalEntry rolls back the whole entry if a line fails (atomic)", async () => {
		const accountAId = generateId<TAccountId>();
		const entryId = generateId<TJournalEntryId>();
		const lineAId = generateId<TJournalEntryLineId>();
		const badLineId = generateId<TJournalEntryLineId>();

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO chart_of_accounts (id, business_id, code, name, type, is_active) VALUES (${accountAId as unknown as string}, ${tenantId}, ${`${prefix}-COA-rollback`}, ${`${prefix} Rollback`}, 'asset', true)`,
		);

		// Intentionally reference a non-existent account_id to force the
		// INSERT into journal_entry_lines to fail. The header INSERT must
		// roll back too — that's the contract the RPC gave us.
		const nonExistentAccountId = generateId();

		const error = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveJournalEntry({
						id: entryId,
						tenantId,
						entryNumber: `${prefix}-JE-rollback`,
						entryDate: new Date(),
						description: null,
						referenceType: null,
						referenceId: null,
						status: "posted",
						createdBy: userId,
						lines: [
							{
								id: lineAId,
								journalEntryId: entryId,
								accountId: accountAId,
								debit: 100,
								credit: 0,
								description: null,
							},
							{
								id: badLineId,
								journalEntryId: entryId,
								accountId: nonExistentAccountId as unknown as TAccountId,
								debit: 0,
								credit: 100,
								description: null,
							},
						],
					}),
				),
			),
		).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(Error);

		// Confirm rollback: the journal_entries row must NOT exist.
		const rowCheck = await db.execute<{ count: number }>(
			sql`SELECT COUNT(*)::int AS count FROM journal_entries WHERE id = ${entryId as unknown as string}`,
		);
		expect(Number(rowCheck.rows[0]?.count ?? 0)).toBe(0);
	}, 20000);

	it("getProfitLossReport aggregates orders (revenue) and expenses (cost)", async () => {
		const expenseId = generateId<TExpenseId>();

		await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveExpense({
						id: expenseId,
						tenantId,
						branchId: null,
						category: "grooming",
						description: `${prefix} PnL expense`,
						amount: 750,
						expenseDate: new Date(),
						paymentMethod: "cash",
						receiptUrl: null,
						notes: null,
						createdBy: userId,
					}),
				),
			),
		);

		const today = new Date();
		const start = new Date(today.getFullYear(), today.getMonth(), 1);
		const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

		const report = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.getProfitLossReport(tenantId, start, end),
				),
			),
		);

		const grooming = report.expenses.find((e) => e.category === "grooming");
		expect(grooming).toBeDefined();
		expect(grooming?.amount).toBe(750);
		expect(report.totalExpense).toBeGreaterThanOrEqual(750);
	}, 20000);

	it("getFinancialSummary computes monthly totals and petty cash balance", async () => {
		const pettyInId = generateId<TPettyCashId>();
		const pettyOutId = generateId<TPettyCashId>();

		await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.savePettyCashTransaction({
						id: pettyInId,
						tenantId,
						branchId: null,
						type: "in",
						amount: 2000,
						description: `${prefix} summary in`,
						receiptUrl: null,
						transactionDate: new Date(),
						createdBy: userId,
					}),
				),
			),
		);
		await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) =>
					repo.savePettyCashTransaction({
						id: pettyOutId,
						tenantId,
						branchId: null,
						type: "out",
						amount: 300,
						description: `${prefix} summary out`,
						receiptUrl: null,
						transactionDate: new Date(),
						createdBy: userId,
					}),
				),
			),
		);

		const summary = await run(
			IAccountingRepository.pipe(
				Effect.flatMap((repo) => repo.getFinancialSummary(tenantId)),
			),
		);

		expect(summary.revenueTrend.length).toBe(6);
		expect(summary.pettyCashBalance).toBeGreaterThanOrEqual(2000 - 300);
	}, 20000);

	it("getDashboardMetrics returns 0 counters for an empty tenant", async () => {
		const isolated = generateId<TTenantId>();
		const isolatedOwner = generateId();
		const isolatedPrefix = `__smoke_acc_iso_${Date.now()}`;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${isolated}, ${`${isolatedPrefix} Business`}, ${isolatedOwner}) ON CONFLICT (id) DO NOTHING`,
		);

		try {
			const metrics = await run(
				IAccountingRepository.pipe(
					Effect.flatMap((repo) => repo.getDashboardMetrics(isolated)),
				),
			);
			expect(metrics.activeBoardings).toBe(0);
			expect(metrics.completedMonth).toBe(0);
			expect(metrics.activeBranches).toBe(0);
			expect(metrics.transactionsToday).toBe(0);
			expect(metrics.lowStockProducts).toBe(0);
			expect(metrics.totalCustomers).toBe(0);
			expect(metrics.volumeData.length).toBe(11);
		} finally {
			await db.execute(sql`DELETE FROM businesses WHERE id = ${isolated}`);
		}
	}, 20000);

	it("getCommissionReport and getAttendanceReport are tenant-scoped", async () => {
		const isolated = generateId<TTenantId>();
		const isolatedOwner = generateId();
		const isolatedUser = generateId();
		const isolatedPrefix = `__smoke_acc_reps_${Date.now()}`;
		const isolatedEmail = `${isolatedPrefix}_user@example.com`;

		const db = await getDb();
		await db.execute(
			sql`INSERT INTO users (id, email, password_hash) VALUES (${isolatedUser}, ${isolatedEmail}, 'pw') ON CONFLICT (email) DO NOTHING`,
		);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${isolated}, ${`${isolatedPrefix} Business`}, ${isolatedOwner}) ON CONFLICT (id) DO NOTHING`,
		);
		await db.execute(
			sql`INSERT INTO profiles (user_id, business_id, full_name, email, is_active) VALUES (${isolatedUser}, ${isolated}, ${`${isolatedPrefix} Staff`}, ${isolatedEmail}, true) ON CONFLICT (user_id) DO NOTHING`,
		);

		try {
			const commission = await run(
				IAccountingRepository.pipe(
					Effect.flatMap((repo) => repo.getCommissionReport(isolated)),
				),
			);
			expect(commission.length).toBe(0);

			const attendance = await run(
				IAccountingRepository.pipe(
					Effect.flatMap((repo) => repo.getAttendanceReport(isolated)),
				),
			);
			// Isolated tenant has 1 active profile but no attendance records
			// and no commission rows, so the report maps the profile to one
			// attendance entry (with zero counters) and zero commission rows.
			expect(attendance.length).toBe(1);
			expect(attendance[0]?.totalPresent).toBe(0);
			expect(attendance[0]?.totalLate).toBe(0);
			expect(attendance[0]?.totalAbsent).toBeGreaterThanOrEqual(0);
		} finally {
			await db.execute(
				sql`DELETE FROM profiles WHERE business_id = ${isolated}`,
			);
			await db.execute(sql`DELETE FROM businesses WHERE id = ${isolated}`);
			await db.execute(sql`DELETE FROM users WHERE email = ${isolatedEmail}`);
			void isolatedPrefix;
		}
	}, 20000);

	it("getCashFlowReport aggregates orders + boardings (no data → zero net)", async () => {
		const isolated = generateId<TTenantId>();
		const isolatedOwner = generateId();
		const isolatedPrefix = `__smoke_acc_cf_${Date.now()}`;
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${isolated}, ${`${isolatedPrefix} Business`}, ${isolatedOwner}) ON CONFLICT (id) DO NOTHING`,
		);

		try {
			const today = new Date();
			const start = new Date(today.getFullYear(), today.getMonth(), 1);
			const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

			const report = await run(
				IAccountingRepository.pipe(
					Effect.flatMap((repo) =>
						repo.getCashFlowReport(isolated, start, end),
					),
				),
			);
			expect(report.totalInflow).toBe(0);
			expect(report.totalOutflow).toBe(0);
			expect(report.netCashFlow).toBe(0);
			expect(report.inflows.length).toBe(2);
			expect(report.outflows.length).toBe(3);
		} finally {
			await db.execute(sql`DELETE FROM businesses WHERE id = ${isolated}`);
		}
	}, 20000);
});
