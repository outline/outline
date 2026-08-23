export interface TPurchaseOrderItemDto {
	readonly id: string;
	readonly poId: string;
	readonly variantId: string;
	readonly qtyOrdered: number;
	readonly qtyReceived: number;
	readonly unitCost: number;
	readonly subtotal: number;
}

export interface TPurchaseOrderDto {
	readonly id: string;
	readonly branchId: string | null;
	readonly supplierId: string;
	readonly poNumber: string;
	readonly status: string;
	readonly totalAmount: number;
	readonly notes: string | null;
	readonly orderDate: string;
	readonly expectedDate: string | null;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly items: readonly TPurchaseOrderItemDto[];
}

export interface TCreatePurchaseOrderInput {
	readonly branchId?: string | null;
	readonly supplierId: string;
	readonly expectedDate?: string | null;
	readonly notes?: string | null;
	readonly items: readonly {
		readonly variantId: string;
		readonly qtyOrdered: number;
		readonly unitCost: number;
	}[];
}

export interface TReceivePurchaseOrderInput {
	readonly poId: string;
	readonly notes?: string | null;
	readonly items: readonly {
		readonly poItemId: string;
		readonly qtyReceived: number;
		readonly expiryDate?: string | null;
		readonly batchNumber?: string | null;
	}[];
}
