import type { TCustomerId } from "@/domain/customer";
import type { TId } from "@/shared/types/common.types";

export type TInvoiceId = TId & { readonly _brand: "InvoiceId" };
export type TInvoiceItemId = TId & { readonly _brand: "InvoiceItemId" };
export type TInvoicePaymentId = TId & { readonly _brand: "InvoicePaymentId" };

export type TInvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "void";

export interface TInvoiceItemDto {
	id: TInvoiceItemId;
	invoiceId: TInvoiceId;
	itemName: string;
	quantity: number;
	unitPrice: number;
	discount: number;
	total: number;
}

export interface TInvoicePaymentDto {
	id: TInvoicePaymentId;
	invoiceId: TInvoiceId;
	paymentDate: string; // ISO timestamp
	amount: number;
	method: string;
	reference: string | null;
	recordedBy: string | null;
}

export interface TInvoiceDto {
	id: TInvoiceId;
	businessId: string;
	branchId: string | null;
	customerId: TCustomerId;
	invoiceNumber: string;
	status: TInvoiceStatus;
	issueDate: string; // ISO date YYYY-MM-DD
	dueDate: string; // ISO date YYYY-MM-DD
	subtotal: number;
	taxAmount: number;
	discountAmount: number;
	totalAmount: number;
	amountPaid: number;
	notes: string | null;
	terms: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;

	// Relations
	items?: TInvoiceItemDto[];
	payments?: TInvoicePaymentDto[];
	customerName?: string;
}
