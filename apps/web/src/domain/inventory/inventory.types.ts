import type { TProductVariantId } from "@/domain/product/product.types";
import type { TId, TTenantId } from "@/shared/types/common.types";

export type TProductBatchId = TId & { readonly _brand: "ProductBatchId" };
export type TStockMovementId = TId & { readonly _brand: "StockMovementId" };
export type TSupplierId = TId & { readonly _brand: "SupplierId" };
export type TPurchaseOrderId = TId & { readonly _brand: "PurchaseOrderId" };

export const MOVEMENT_TYPE = [
	"in",
	"out",
	"adjustment",
	"transfer",
	"return",
] as const;
export type TMovementType = (typeof MOVEMENT_TYPE)[number];

export const REFERENCE_TYPE = [
	"order",
	"po",
	"adjustment",
	"transfer",
] as const;
export type TReferenceType = (typeof REFERENCE_TYPE)[number];

export type TProductBatch = {
	readonly id: TProductBatchId;
	readonly tenantId: TTenantId;
	readonly variantId: TProductVariantId;
	readonly warehouseId?: string | null;
	readonly batchNumber: string | null;
	readonly quantity: number;
	readonly initialQty: number;
	readonly costPrice: number;
	readonly receivedAt: Date;
	readonly expiryDate: Date | null;
	readonly supplierId: TSupplierId | null;
	readonly poId: TPurchaseOrderId | null;
	readonly notes: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TStockMovement = {
	readonly id: TStockMovementId;
	readonly tenantId: TTenantId;
	readonly variantId: TProductVariantId;
	readonly batchId: TProductBatchId | null;
	readonly sourceWarehouseId?: string | null;
	readonly targetWarehouseId?: string | null;
	readonly type: TMovementType;
	readonly quantity: number;
	readonly referenceType: TReferenceType | null;
	readonly referenceId: string | null;
	readonly notes: string | null;
	readonly createdBy: string | null;
	readonly createdAt: Date;
};
