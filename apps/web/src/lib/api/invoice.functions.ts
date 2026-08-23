import { Schema } from "@effect/schema";
import { createServerFn } from "@tanstack/react-start";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	createInvoiceProgram,
	getInvoiceByIdProgram,
	getInvoicesProgram,
	recordPaymentProgram,
} from "@/domain/invoice/invoice.programs";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

const InvoiceItemSchema = Schema.Struct({
	itemName: Schema.String,
	quantity: Schema.Number,
	unitPrice: Schema.Number,
	discount: Schema.Number,
	total: Schema.Number,
});

const CreateInvoiceSchema = Schema.Struct({
	customerId: Schema.String,
	issueDate: Schema.String,
	dueDate: Schema.String,
	subtotal: Schema.Number,
	taxAmount: Schema.Number,
	discountAmount: Schema.Number,
	totalAmount: Schema.Number,
	notes: Schema.optionalWith(Schema.String, { exact: true }),
	terms: Schema.optionalWith(Schema.String, { exact: true }),
	items: Schema.Array(InvoiceItemSchema),
});

const RecordPaymentSchema = Schema.Struct({
	amount: Schema.Number,
	paymentDate: Schema.String,
	method: Schema.String,
	reference: Schema.optionalWith(Schema.String, { exact: true }),
});

export const getInvoices = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((status?: string) => status)
	.handler(async ({ data: status, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getInvoicesProgram(businessId as TTenantId, status));
	});

export const getInvoiceById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Bisnis tidak ditemukan");
		return await runApp(
			getInvoiceByIdProgram(
				businessId as TTenantId,
				id as import("@/domain/invoice/invoice.types").TInvoiceId,
			),
		);
	});

export const createInvoice = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateInvoiceSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "invoice:write"));
		return await runApp(
			createInvoiceProgram(
				tenantId,
				data as import("@/domain/invoice/invoice.repository").ICreateInvoiceCommand,
			),
		);
	});

export const payInvoice = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(
		Schema.decodeUnknownSync(
			Schema.Struct({
				invoiceId: Schema.String,
				payment: RecordPaymentSchema,
			}),
		),
	)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "invoice:write"));
		return await runApp(
			recordPaymentProgram(
				tenantId,
				data.invoiceId as import("@/domain/invoice/invoice.types").TInvoiceId,
				data.payment,
			),
		);
	});
