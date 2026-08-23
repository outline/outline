export interface TInventoryBatchDto {
	readonly id: string;
	readonly variantId: string;
	readonly batchNumber: string | null;
	readonly quantity: number;
	readonly initialQty: number;
	readonly costPrice: number;
	readonly receivedAt: string;
	readonly expiryDate: string | null;
	readonly supplierId: string | null;
	readonly poId: string | null;
	readonly notes: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TInventoryMovementDto {
	readonly id: string;
	readonly variantId: string;
	readonly batchId: string | null;
	readonly type: string;
	readonly quantity: number;
	readonly referenceType: string | null;
	readonly referenceId: string | null;
	readonly notes: string | null;
	readonly createdBy: string | null;
	readonly createdAt: string;
}

export interface TInventorySnapshot {
	readonly batches: readonly TInventoryBatchDto[];
	readonly movements: readonly TInventoryMovementDto[];
}

export interface TAdjustStockInput {
	readonly variantId: string;
	readonly quantity: number;
	readonly notes: string;
}
