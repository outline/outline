import type { TProductVariantId } from "@/domain/product/product.types";
import type { TSupplierId } from "@/domain/supplier/supplier.types";
import type {
	TBranchId,
	TId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";

export type TPurchaseOrderId = TId & { readonly _brand: "PurchaseOrderId" };
export type TPoItemId = TId & { readonly _brand: "PoItemId" };
export type TPoReceivingId = TId & { readonly _brand: "PoReceivingId" };
export type TPoReceivingItemId = TId & { readonly _brand: "PoReceivingItemId" };

export const PO_STATUS = [
	"draft",
	"sent",
	"partial",
	"received",
	"cancelled",
] as const;
export type TPoStatus = (typeof PO_STATUS)[number];

export type TPurchaseOrder = {
	readonly id: TPurchaseOrderId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId | null;
	readonly supplierId: TSupplierId;
	readonly poNumber: string;
	readonly status: TPoStatus;
	readonly totalAmount: number;
	readonly notes: string | null;
	readonly orderDate: Date;
	readonly expectedDate: Date | null;
	readonly createdBy: TUserId;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TPoItem = {
	readonly id: TPoItemId;
	readonly poId: TPurchaseOrderId;
	readonly variantId: TProductVariantId;
	readonly qtyOrdered: number;
	readonly qtyReceived: number;
	readonly unitCost: number;
	readonly subtotal: number;
};

export type TPoReceiving = {
	readonly id: TPoReceivingId;
	readonly poId: TPurchaseOrderId;
	readonly receivedDate: Date;
	readonly notes: string | null;
	readonly receivedBy: TUserId;
};

export type TPoReceivingItem = {
	readonly id: TPoReceivingItemId;
	readonly receivingId: TPoReceivingId;
	readonly poItemId: TPoItemId;
	readonly qtyReceived: number;
	readonly expiryDate: Date | null;
	readonly batchNumber: string | null;
};

export type TPurchaseOrderWithItems = TPurchaseOrder & {
	readonly items: readonly TPoItem[];
};
