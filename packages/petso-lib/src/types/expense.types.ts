export interface TExpenseDto {
	readonly id: string;
	readonly category: string;
	readonly description: string;
	readonly amount: number;
	readonly expenseDate: string;
	readonly paymentMethod: string;
	readonly receiptUrl: string | null;
}

export interface TCreateExpenseInput {
	readonly branchId: string | null;
	readonly category: string;
	readonly description: string;
	readonly amount: number;
	readonly expenseDate: string;
	readonly paymentMethod?: string;
	readonly receiptUrl: string | null;
	readonly notes: string | null;
}
