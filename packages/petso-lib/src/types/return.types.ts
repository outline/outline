export interface TCreateReturnInput {
	readonly orderId: string;
	readonly refundMethod?: string | null;
	readonly refundAmount: number;
	readonly reason?: string | null;
	readonly items: readonly {
		readonly orderItemId: string;
		readonly qty: number;
		readonly reason?: string | null;
		readonly isDamaged: boolean;
	}[];
}
