// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TCustomerId } from "@/domain/customer/customer.types";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { customers } from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { InvoiceNotFoundError } from "./invoice.errors";
import {
	type IInvoiceRepository,
	InvoiceRepository,
} from "./invoice.repository";
import { InvoiceRepositoryDrizzle } from "./invoice.repository.drizzle";
import type { TInvoiceId } from "./invoice.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const invoiceRepoLayer = Layer.provide(
	InvoiceRepositoryDrizzle,
	DrizzleClientLive,
);

const run = <A, E>(effect: Effect.Effect<A, E, IInvoiceRepository>) =>
	Effect.runPromise(Effect.provide(effect, invoiceRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = () =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

describe.skipIf(!hasDb)("invoice repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const otherTenantId = generateId<TTenantId>();
	const prefix = `__smoke_inv_${Date.now()}`;

	const seedBusiness = async (id: TTenantId, label: string) => {
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${id}, ${label}, ${generateId()}) ON CONFLICT (id) DO NOTHING`,
		);
	};

	const seedCustomer = async (
		businessId: TTenantId,
		label: string,
	): Promise<TCustomerId> => {
		const id = generateId<TCustomerId>();
		const db = await getDb();
		await db.insert(customers).values({
			id,
			businessId,
			fullName: label,
			phone: generateId(),
		});
		return id;
	};

	beforeAll(async () => {
		if (!hasDb) return;
		await seedBusiness(tenantId, `${prefix} Business`);
		await seedBusiness(otherTenantId, `${prefix} Other Business`);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE business_id IN (${tenantId}, ${otherTenantId}))`,
		);
		await db.execute(
			sql`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE business_id IN (${tenantId}, ${otherTenantId}))`,
		);
		await db.execute(
			sql`DELETE FROM invoices WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM customers WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM businesses WHERE id IN (${tenantId}, ${otherTenantId})`,
		);
	});

	it("creates an invoice with items atomically", async () => {
		const customerId = await seedCustomer(tenantId, `${prefix} Customer One`);

		const created = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.create(tenantId, {
						customerId,
						invoiceNumber: `${prefix}-INV-001`,
						issueDate: "2026-07-08",
						dueDate: "2026-07-15",
						subtotal: 100_000,
						taxAmount: 10_000,
						discountAmount: 5_000,
						totalAmount: 105_000,
						notes: `${prefix} create-test`,
						items: [
							{
								itemName: "Grooming A",
								quantity: 1,
								unitPrice: 100_000,
								discount: 5_000,
								total: 95_000,
							},
						],
					}),
				),
			),
		);

		expect(created.businessId).toBe(tenantId);
		expect(created.customerId).toBe(customerId);
		expect(created.status).toBe("unpaid");
		expect(created.amountPaid).toBe(0);
		expect(created.totalAmount).toBe(105_000);

		const db = await getDb();
		const itemCount = await db.execute(
			sql`SELECT COUNT(*)::int AS c FROM invoice_items WHERE invoice_id = ${created.id}`,
		);
		expect(Number(itemCount.rows[0]?.c)).toBe(1);
	}, 15000);

	it("finds all invoices filtered by business and status", async () => {
		const customerId = await seedCustomer(tenantId, `${prefix} Customer Two`);

		const created = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.create(tenantId, {
						customerId,
						invoiceNumber: `${prefix}-INV-002`,
						issueDate: "2026-07-09",
						dueDate: "2026-07-16",
						subtotal: 50_000,
						taxAmount: 5_000,
						discountAmount: 0,
						totalAmount: 55_000,
						items: [],
					}),
				),
			),
		);

		const all = await run(
			InvoiceRepository.pipe(Effect.flatMap((repo) => repo.findAll(tenantId))),
		);
		expect(all.length).toBeGreaterThanOrEqual(2);
		expect(all.some((i) => i.id === created.id)).toBe(true);

		const unpaid = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) => repo.findAll(tenantId, "unpaid")),
			),
		);
		expect(unpaid.every((i) => i.status === "unpaid")).toBe(true);
	}, 15000);

	it("finds an invoice by id with items and customer name", async () => {
		const customerId = await seedCustomer(tenantId, `${prefix} Customer Three`);

		const created = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.create(tenantId, {
						customerId,
						invoiceNumber: `${prefix}-INV-003`,
						issueDate: "2026-07-10",
						dueDate: "2026-07-17",
						subtotal: 200_000,
						taxAmount: 20_000,
						discountAmount: 0,
						totalAmount: 220_000,
						items: [
							{
								itemName: "Boarding Day",
								quantity: 2,
								unitPrice: 100_000,
								discount: 0,
								total: 200_000,
							},
						],
					}),
				),
			),
		);

		const found = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findById(tenantId, created.id as TInvoiceId),
				),
			),
		);

		expect(found.id).toBe(created.id);
		expect(found.customerName).toBe(`${prefix} Customer Three`);
		expect(found.items?.length).toBe(1);
		expect(found.items?.[0]?.itemName).toBe("Boarding Day");
		expect(found.payments?.length ?? 0).toBe(0);
	}, 15000);

	it("records a partial payment and transitions status to partial", async () => {
		const customerId = await seedCustomer(
			tenantId,
			`${prefix} Customer Partial`,
		);

		const created = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.create(tenantId, {
						customerId,
						invoiceNumber: `${prefix}-INV-PARTIAL`,
						issueDate: "2026-07-11",
						dueDate: "2026-07-18",
						subtotal: 100_000,
						taxAmount: 0,
						discountAmount: 0,
						totalAmount: 100_000,
						items: [],
					}),
				),
			),
		);

		const payment = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.recordPayment(tenantId, created.id as TInvoiceId, {
						amount: 40_000,
						paymentDate: new Date().toISOString(),
						method: "cash",
						reference: "TRX-PARTIAL",
					}),
				),
			),
		);

		expect(payment.amount).toBe(40_000);
		expect(payment.method).toBe("cash");

		const refreshed = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findById(tenantId, created.id as TInvoiceId),
				),
			),
		);

		expect(refreshed.status).toBe("partial");
		expect(refreshed.amountPaid).toBe(40_000);
		expect(refreshed.payments?.length).toBe(1);
	}, 15000);

	it("records a final payment to flip invoice to paid", async () => {
		const customerId = await seedCustomer(tenantId, `${prefix} Customer Final`);

		const created = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.create(tenantId, {
						customerId,
						invoiceNumber: `${prefix}-INV-FINAL`,
						issueDate: "2026-07-12",
						dueDate: "2026-07-19",
						subtotal: 100_000,
						taxAmount: 0,
						discountAmount: 0,
						totalAmount: 100_000,
						items: [],
					}),
				),
			),
		);

		await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.recordPayment(tenantId, created.id as TInvoiceId, {
						amount: 60_000,
						paymentDate: new Date().toISOString(),
						method: "transfer",
					}),
				),
			),
		);

		await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.recordPayment(tenantId, created.id as TInvoiceId, {
						amount: 40_000,
						paymentDate: new Date().toISOString(),
						method: "cash",
					}),
				),
			),
		);

		const refreshed = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findById(tenantId, created.id as TInvoiceId),
				),
			),
		);

		expect(refreshed.status).toBe("paid");
		expect(refreshed.amountPaid).toBe(100_000);
		expect(refreshed.payments?.length).toBe(2);
	}, 15000);

	it("rejects payment for invoice belonging to another business", async () => {
		const customerId = await seedCustomer(
			otherTenantId,
			`${prefix} Customer Other`,
		);
		const invoiceId = generateId<TInvoiceId>();
		const db = await getDb();
		await db.execute(
			sql`INSERT INTO invoices (id, business_id, customer_id, invoice_number, status, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_paid) VALUES (${invoiceId}, ${otherTenantId}, ${customerId}, ${`${prefix}-OTHER-INV`}, 'unpaid', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 100000, 0, 0, 100000, 0)`,
		);

		try {
			const result = await run(
				InvoiceRepository.pipe(
					Effect.flatMap((repo) =>
						repo
							.recordPayment(tenantId, invoiceId, {
								amount: 50_000,
								paymentDate: new Date().toISOString(),
								method: "cash",
							})
							.pipe(Effect.flip),
					),
				),
			);
			const failed = Array.isArray(result) ? result[0] : result;
			expect(failed).toBeInstanceOf(InvoiceNotFoundError);
		} finally {
			await db.execute(
				sql`DELETE FROM invoice_payments WHERE invoice_id = ${invoiceId}`,
			);
			await db.execute(sql`DELETE FROM invoices WHERE id = ${invoiceId}`);
		}
	}, 15000);

	it("rejects findById with InvoiceNotFoundError for unknown invoice", async () => {
		const error = await run(
			InvoiceRepository.pipe(
				Effect.flatMap((repo) =>
					repo
						.findById(
							tenantId,
							"00000000-0000-0000-0000-000000000000" as TInvoiceId,
						)
						.pipe(Effect.flip),
				),
			),
		);
		const failed = Array.isArray(error) ? error[0] : error;
		expect(failed).toBeInstanceOf(InvoiceNotFoundError);
	}, 15000);
});
