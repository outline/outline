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

export interface TReturnDto {
	readonly id: string;
	readonly orderId: string;
	readonly status: string;
	readonly refundMethod: string | null;
	readonly refundAmount: number;
	readonly reason: string | null;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly items: readonly {
		readonly id: string;
		readonly returnId: string;
		readonly orderItemId: string;
		readonly qty: number;
		readonly reason: string | null;
		readonly isDamaged: boolean;
	}[];
}
