import type { TProductVariantId } from "@/domain/product/product.types";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TMovementType,
	TProductBatch,
	TProductBatchId,
	TPurchaseOrderId,
	TReferenceType,
	TStockMovement,
	TStockMovementId,
	TSupplierId,
} from "./inventory.types";

export type TProductBatchDto = {
	readonly id: string;
	readonly business_id: string;
	readonly variant_id: string;
	readonly warehouse_id?: string | null;
	readonly batch_number: string | null;
	readonly quantity: number;
	readonly initial_qty: number;
	readonly cost_price: number;
	readonly received_at: string;
	readonly expiry_date: string | null;
	readonly supplier_id: string | null;
	readonly po_id: string | null;
	readonly notes: string | null;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toProductBatch = (dto: TProductBatchDto): TProductBatch => ({
	id: dto.id as TProductBatchId,
	tenantId: dto.business_id as TTenantId,
	variantId: dto.variant_id as TProductVariantId,
	warehouseId: dto.warehouse_id ?? null,
	batchNumber: dto.batch_number,
	quantity: Number(dto.quantity),
	initialQty: Number(dto.initial_qty),
	costPrice: Number(dto.cost_price),
	receivedAt: new Date(dto.received_at),
	expiryDate: dto.expiry_date ? new Date(dto.expiry_date) : null,
	supplierId: dto.supplier_id as TSupplierId | null,
	poId: dto.po_id as TPurchaseOrderId | null,
	notes: dto.notes,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export type TStockMovementDto = {
	readonly id: string;
	readonly business_id: string;
	readonly variant_id: string;
	readonly batch_id: string | null;
	readonly source_warehouse_id?: string | null;
	readonly target_warehouse_id?: string | null;
	readonly type: string;
	readonly quantity: number;
	readonly reference_type: string | null;
	readonly reference_id: string | null;
	readonly notes: string | null;
	readonly created_by: string | null;
	readonly created_at: string;
};

export const toStockMovement = (dto: TStockMovementDto): TStockMovement => ({
	id: dto.id as TStockMovementId,
	tenantId: dto.business_id as TTenantId,
	variantId: dto.variant_id as TProductVariantId,
	batchId: dto.batch_id as TProductBatchId | null,
	sourceWarehouseId: dto.source_warehouse_id ?? null,
	targetWarehouseId: dto.target_warehouse_id ?? null,
	type: dto.type as TMovementType,
	quantity: Number(dto.quantity),
	referenceType: dto.reference_type as TReferenceType | null,
	referenceId: dto.reference_id,
	notes: dto.notes,
	createdBy: dto.created_by,
	createdAt: new Date(dto.created_at),
});
