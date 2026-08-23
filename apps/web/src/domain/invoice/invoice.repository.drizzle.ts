import { and, desc, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	customers,
	invoiceItems,
	invoicePayments,
	invoices,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId, withRetry } from "@/shared/utils";
import type {
	TInvoiceDbRow,
	TInvoiceItemDbRow,
	TInvoicePaymentDbRow,
} from "./invoice.dto";
import {
	mapInvoiceItemToDto,
	mapInvoicePaymentToDto,
	mapInvoiceToDto,
} from "./invoice.dto";
import { InvoiceNotFoundError } from "./invoice.errors";
import {
	type ICreateInvoiceCommand,
	type IInvoiceRepository,
	InvoiceRepository,
	type IRecordPaymentCommand,
} from "./invoice.repository";
import type {
	TInvoiceDto,
	TInvoiceId,
	TInvoicePaymentId,
} from "./invoice.types";

type TInvoiceRow = typeof invoices.$inferSelect;
type TInvoiceItemRow = typeof invoiceItems.$inferSelect;
type TInvoicePaymentRow = typeof invoicePayments.$inferSelect;

const toDtoRow = (
	row: TInvoiceRow,
	customerName: string | null,
): TInvoiceDbRow => {
	const base: TInvoiceDbRow = {
		id: row.id,
		business_id: row.businessId,
		branch_id: row.branchId,
		customer_id: row.customerId,
		invoice_number: row.invoiceNumber,
		status: row.status,
		issue_date: row.issueDate,
		due_date: row.dueDate,
		subtotal: Number(row.subtotal),
		tax_amount: Number(row.taxAmount),
		discount_amount: Number(row.discountAmount),
		total_amount: Number(row.totalAmount),
		amount_paid: Number(row.amountPaid),
		notes: row.notes,
		terms: row.terms,
		created_by: row.createdBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	};
	if (customerName !== null) {
		base.customers = { full_name: customerName };
	}
	return base;
};

const toItemRow = (row: TInvoiceItemRow): TInvoiceItemDbRow => ({
	id: row.id,
	invoice_id: row.invoiceId,
	item_name: row.itemName,
	quantity: Number(row.quantity),
	unit_price: Number(row.unitPrice),
	discount: Number(row.discount),
	total: Number(row.total),
});

const toPaymentRow = (row: TInvoicePaymentRow): TInvoicePaymentDbRow => ({
	id: row.id,
	invoice_id: row.invoiceId,
	payment_date: row.paymentDate,
	amount: Number(row.amount),
	method: row.method,
	reference: row.reference,
	recorded_by: row.recordedBy,
});

const mapToDto = (row: TInvoiceRow, customerName: string | null): TInvoiceDto =>
	mapInvoiceToDto(toDtoRow(row, customerName));

const invalidateNotFound = (
	e: unknown,
): InvoiceNotFoundError | DatabaseError =>
	e instanceof InvoiceNotFoundError
		? e
		: new DatabaseError({ cause: e as Error });

export const InvoiceRepositoryDrizzle = Layer.effect(
	InvoiceRepository,
	Effect.map(
		IDrizzleClient,
		(db): IInvoiceRepository =>
			InvoiceRepository.of({
				create: (tenantId: TTenantId, cmd: ICreateInvoiceCommand) =>
					withRetry(
						Effect.tryPromise({
							try: async () => {
								const inserted = await db.transaction(async (tx) => {
									const [row] = await tx
										.insert(invoices)
										.values({
											businessId: tenantId,
											customerId: cmd.customerId,
											invoiceNumber: cmd.invoiceNumber,
											status: "unpaid",
											issueDate: cmd.issueDate,
											dueDate: cmd.dueDate,
											subtotal: String(cmd.subtotal),
											taxAmount: String(cmd.taxAmount),
											discountAmount: String(cmd.discountAmount),
											totalAmount: String(cmd.totalAmount),
											amountPaid: "0",
											notes: cmd.notes ?? null,
											terms: cmd.terms ?? null,
										})
										.returning();

									if (!row) {
										throw new Error("Invoice insert returned no row");
									}

									if (cmd.items.length > 0) {
										await tx.insert(invoiceItems).values(
											cmd.items.map((item) => ({
												id: generateId(),
												invoiceId: row.id,
												itemName: item.itemName,
												quantity: String(item.quantity),
												unitPrice: String(item.unitPrice),
												discount: String(item.discount),
												total: String(item.total),
											})),
										);
									}

									return row;
								});

								return mapToDto(inserted, null);
							},
							catch: (e) => new DatabaseError({ cause: e as Error }),
						}),
					),

				findAll: (tenantId: TTenantId, status?: string) =>
					withRetry(
						Effect.tryPromise({
							try: async () => {
								const conditions = [eq(invoices.businessId, tenantId)];
								if (status && status !== "all") {
									conditions.push(eq(invoices.status, status));
								}

								const rows = await db
									.select({
										invoice: invoices,
										customerName: customers.fullName,
									})
									.from(invoices)
									.innerJoin(customers, eq(customers.id, invoices.customerId))
									.where(and(...conditions))
									.orderBy(desc(invoices.createdAt));

								return rows.map((row) =>
									mapToDto(row.invoice, row.customerName),
								);
							},
							catch: (e) => new DatabaseError({ cause: e as Error }),
						}),
					),

				findById: (tenantId: TTenantId, invoiceId: TInvoiceId) =>
					withRetry(
						Effect.tryPromise({
							try: async () => {
								const rows = await db
									.select({
										invoice: invoices,
										customerName: customers.fullName,
									})
									.from(invoices)
									.innerJoin(customers, eq(customers.id, invoices.customerId))
									.where(
										and(
											eq(invoices.id, invoiceId),
											eq(invoices.businessId, tenantId),
										),
									)
									.limit(1);

								const row = rows[0];
								if (!row) {
									throw new InvoiceNotFoundError({
										message: `Invoice ${invoiceId} not found`,
									});
								}

								const itemRows = await db
									.select()
									.from(invoiceItems)
									.where(eq(invoiceItems.invoiceId, invoiceId));
								const paymentRows = await db
									.select()
									.from(invoicePayments)
									.where(eq(invoicePayments.invoiceId, invoiceId))
									.orderBy(desc(invoicePayments.paymentDate));

								const dto = mapToDto(row.invoice, row.customerName);
								dto.items = itemRows.map((r) =>
									mapInvoiceItemToDto(toItemRow(r)),
								);
								dto.payments = paymentRows.map((r) =>
									mapInvoicePaymentToDto(toPaymentRow(r)),
								);
								return dto;
							},
							catch: invalidateNotFound,
						}),
					),

				recordPayment: (
					tenantId: TTenantId,
					invoiceId: TInvoiceId,
					cmd: IRecordPaymentCommand,
				) =>
					Effect.gen(function* () {
						const payment = yield* withRetry(
							Effect.tryPromise({
								try: async () =>
									db.transaction(async (tx) => {
										const [locked] = await tx
											.select()
											.from(invoices)
											.where(
												and(
													eq(invoices.id, invoiceId),
													eq(invoices.businessId, tenantId),
												),
											)
											.for("update")
											.limit(1);

										if (!locked) {
											throw new InvoiceNotFoundError({
												message: `Invoice ${invoiceId} not found`,
											});
										}

										const [inserted] = await tx
											.insert(invoicePayments)
											.values({
												id: generateId<TInvoicePaymentId>(),
												invoiceId,
												amount: String(cmd.amount),
												paymentDate: cmd.paymentDate,
												method: cmd.method,
												reference: cmd.reference ?? null,
											})
											.returning();

										if (!inserted) {
											throw new Error(
												"invoice_payments insert returned no row",
											);
										}

										await tx
											.update(invoices)
											.set({
												amountPaid: sql`COALESCE(${invoices.amountPaid}, 0) + ${cmd.amount}`,
												status: sql`CASE
												WHEN ${invoices.amountPaid} + ${cmd.amount} >= ${invoices.totalAmount} THEN 'paid'
												WHEN ${invoices.amountPaid} + ${cmd.amount} > 0 THEN 'partial'
												ELSE 'unpaid'
											END`,
												updatedAt: new Date().toISOString(),
											})
											.where(eq(invoices.id, invoiceId));

										return inserted;
									}),
								catch: invalidateNotFound,
							}),
						);

						return mapInvoicePaymentToDto({
							id: payment.id,
							invoice_id: payment.invoiceId,
							payment_date: payment.paymentDate,
							amount: Number(payment.amount),
							method: payment.method,
							reference: payment.reference,
							recorded_by: payment.recordedBy,
						});
					}),
			}),
	),
);
