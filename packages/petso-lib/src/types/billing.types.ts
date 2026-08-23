export interface TBillingSubscriptionDto {
	readonly plan: string;
	readonly status: string;
	readonly currentPeriodEnd: string | null;
	readonly limits: {
		readonly staff: number;
		readonly branches: number;
		readonly boardingsPerMonth: number;
	};
}

export interface TBillingInvoiceDto {
	readonly id: string;
	readonly number: string;
	readonly date: string;
	readonly amount: number;
	readonly status: "paid" | "open";
}

export interface TBillingUsageDto {
	readonly products: number;
	readonly branches: number;
	readonly staff: number;
	readonly activeBoardings: number;
	readonly transactionsMonth: number;
}

export interface TBillingSummaryDto {
	readonly subscription: TBillingSubscriptionDto | null;
	readonly invoices: readonly TBillingInvoiceDto[];
	readonly usage: TBillingUsageDto;
}

export interface TChangePlanInput {
	readonly plan: "free" | "pro" | "business";
}
