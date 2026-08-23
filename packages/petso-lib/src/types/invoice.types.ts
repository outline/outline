export interface TInvoiceItemDto {
	readonly id: string;
	readonly invoiceId: string;
	readonly itemName: string;
	readonly quantity: number;
	readonly unitPrice: number;
	readonly discount: number;
	readonly total: number;
}

export interface TInvoicePaymentDto {
	readonly id: string;
	readonly invoiceId: string;
	readonly paymentDate: string;
	readonly amount: number;
	readonly method: string;
	readonly reference: string | null;
	readonly recordedBy: string | null;
}

export interface TInvoiceDto {
	readonly id: string;
	readonly businessId: string;
	readonly branchId: string | null;
	readonly customerId: string;
	readonly invoiceNumber: string;
	readonly status: string;
	readonly issueDate: string;
	readonly dueDate: string;
	readonly subtotal: number;
	readonly taxAmount: number;
	readonly discountAmount: number;
	readonly totalAmount: number;
	readonly amountPaid: number;
	readonly notes: string | null;
	readonly terms: string | null;
	readonly createdBy: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly items?: readonly TInvoiceItemDto[];
	readonly payments?: readonly TInvoicePaymentDto[];
	readonly customerName?: string;
}

export interface TCreateInvoiceInput {
	readonly customerId: string;
	readonly issueDate: string;
	readonly dueDate: string;
	readonly subtotal: number;
	readonly taxAmount: number;
	readonly discountAmount: number;
	readonly totalAmount: number;
	readonly notes?: string;
	readonly terms?: string;
	readonly items: readonly {
		readonly itemName: string;
		readonly quantity: number;
		readonly unitPrice: number;
		readonly discount: number;
		readonly total: number;
	}[];
}

export interface TRecordInvoicePaymentInput {
	readonly invoiceId: string;
	readonly amount: number;
	readonly paymentDate: string;
	readonly method: string;
	readonly reference?: string;
}
