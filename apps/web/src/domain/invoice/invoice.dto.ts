import type { TCustomerId } from "@/domain/customer";
import type {
	TInvoiceDto,
	TInvoiceId,
	TInvoiceItemDto,
	TInvoiceItemId,
	TInvoicePaymentDto,
	TInvoicePaymentId,
	TInvoiceStatus,
} from "./invoice.types";

export interface TInvoiceDbRow {
	id: string;
	business_id: string;
	branch_id: string | null;
	customer_id: string;
	invoice_number: string;
	status: string;
	issue_date: string;
	due_date: string;
	subtotal: number;
	tax_amount: number;
	discount_amount: number;
	total_amount: number;
	amount_paid: number;
	notes: string | null;
	terms: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	customers?: { full_name: string };
}

export interface TInvoiceItemDbRow {
	id: string;
	invoice_id: string;
	item_name: string;
	quantity: number;
	unit_price: number;
	discount: number;
	total: number;
}

export interface TInvoicePaymentDbRow {
	id: string;
	invoice_id: string;
	payment_date: string;
	amount: number;
	method: string;
	reference: string | null;
	recorded_by: string | null;
}

export function mapInvoiceToDto(row: TInvoiceDbRow): TInvoiceDto {
	return {
		id: row.id as TInvoiceId,
		businessId: row.business_id,
		branchId: row.branch_id,
		customerId: row.customer_id as TCustomerId,
		invoiceNumber: row.invoice_number,
		status: row.status as TInvoiceStatus,
		issueDate: row.issue_date,
		dueDate: row.due_date,
		subtotal: Number(row.subtotal),
		taxAmount: Number(row.tax_amount),
		discountAmount: Number(row.discount_amount),
		totalAmount: Number(row.total_amount),
		amountPaid: Number(row.amount_paid),
		notes: row.notes,
		terms: row.terms,
		createdBy: row.created_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		customerName: row.customers?.full_name || "Unknown",
	};
}

export function mapInvoiceItemToDto(row: TInvoiceItemDbRow): TInvoiceItemDto {
	return {
		id: row.id as TInvoiceItemId,
		invoiceId: row.invoice_id as TInvoiceId,
		itemName: row.item_name,
		quantity: Number(row.quantity),
		unitPrice: Number(row.unit_price),
		discount: Number(row.discount),
		total: Number(row.total),
	};
}

export function mapInvoicePaymentToDto(
	row: TInvoicePaymentDbRow,
): TInvoicePaymentDto {
	return {
		id: row.id as TInvoicePaymentId,
		invoiceId: row.invoice_id as TInvoiceId,
		paymentDate: row.payment_date,
		amount: Number(row.amount),
		method: row.method,
		reference: row.reference,
		recordedBy: row.recorded_by,
	};
}
