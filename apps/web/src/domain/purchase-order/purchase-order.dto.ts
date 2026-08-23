import type { TProductVariantId } from "@/domain/product/product.types";
import type { TSupplierId } from "@/domain/supplier/supplier.types";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import type {
	TPoItem,
	TPoItemId,
	TPoStatus,
	TPurchaseOrder,
	TPurchaseOrderId,
} from "./purchase-order.types";

export type TPurchaseOrderDto = {
	readonly id: string;
	readonly business_id: string;
	readonly branch_id: string | null;
	readonly supplier_id: string;
	readonly po_number: string;
	readonly status: string;
	readonly total_amount: number;
	readonly notes: string | null;
	readonly order_date: string;
	readonly expected_date: string | null;
	readonly created_by: string;
	readonly created_at: string;
	readonly updated_at: string;
};

export type TPoItemDto = {
	readonly id: string;
	readonly po_id: string;
	readonly variant_id: TProductVariantId;
	readonly qty_ordered: number;
	readonly qty_received: number;
	readonly unit_cost: number;
	readonly subtotal: number;
};

export const toPurchaseOrderDomain = (
	dto: TPurchaseOrderDto,
): TPurchaseOrder => ({
	id: dto.id as TPurchaseOrderId,
	tenantId: dto.business_id as TTenantId,
	branchId: dto.branch_id as TBranchId | null,
	supplierId: dto.supplier_id as TSupplierId,
	poNumber: dto.po_number,
	status: dto.status as TPoStatus,
	totalAmount: Number(dto.total_amount),
	notes: dto.notes,
	orderDate: new Date(dto.order_date),
	expectedDate: dto.expected_date ? new Date(dto.expected_date) : null,
	createdBy: dto.created_by as TUserId,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export const toPoItemDomain = (dto: TPoItemDto): TPoItem => ({
	id: dto.id as TPoItemId,
	poId: dto.po_id as TPurchaseOrderId,
	variantId: dto.variant_id as TProductVariantId,
	qtyOrdered: Number(dto.qty_ordered),
	qtyReceived: Number(dto.qty_received),
	unitCost: Number(dto.unit_cost),
	subtotal: Number(dto.subtotal),
});
