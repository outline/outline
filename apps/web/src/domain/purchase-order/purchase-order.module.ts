import { Effect } from "effect";
import type { TProductVariantId } from "@/domain/product/product.types";
import type { TSupplierId } from "@/domain/supplier/supplier.types";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type {
	TCreatePurchaseOrderInput,
	TReceivePurchaseOrderInput,
} from "./purchase-order.schemas";
import type {
	TPoItem,
	TPoItemId,
	TPoReceiving,
	TPoReceivingId,
	TPoReceivingItem,
	TPoReceivingItemId,
	TPurchaseOrder,
	TPurchaseOrderId,
	TPurchaseOrderWithItems,
} from "./purchase-order.types";

const generatePoNumber = () => {
	const date = new Date();
	const d = String(date.getDate()).padStart(2, "0");
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const y = String(date.getFullYear()).slice(-2);
	const random = Math.floor(1000 + Math.random() * 9000);
	return `PO-${y}${m}${d}-${random}`;
};

export const createPurchaseOrderEntity = (
	input: TCreatePurchaseOrderInput,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<TPurchaseOrderWithItems> =>
	Effect.sync(() => {
		const poId = generateId<TPurchaseOrderId>();
		let totalAmount = 0;

		const items: TPoItem[] = input.items.map((item) => {
			const subtotal = item.qtyOrdered * item.unitCost;
			totalAmount += subtotal;

			return {
				id: generateId<TPoItemId>(),
				poId,
				variantId: item.variantId as TProductVariantId,
				qtyOrdered: item.qtyOrdered,
				qtyReceived: 0,
				unitCost: item.unitCost,
				subtotal,
			};
		});

		const order: TPurchaseOrder = {
			id: poId,
			tenantId,
			branchId: input.branchId as TBranchId | null,
			supplierId: input.supplierId as TSupplierId,
			poNumber: generatePoNumber(),
			status: "draft",
			totalAmount,
			notes: input.notes ?? null,
			orderDate: new Date(),
			expectedDate: input.expectedDate ?? null,
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return { ...order, items };
	});

export const createReceivingEntity = (
	poId: TPurchaseOrderId,
	input: TReceivePurchaseOrderInput,
	userId: TUserId,
): Effect.Effect<{ receiving: TPoReceiving; items: TPoReceivingItem[] }> =>
	Effect.sync(() => {
		const receivingId = generateId<TPoReceivingId>();

		const receiving: TPoReceiving = {
			id: receivingId,
			poId,
			receivedDate: new Date(),
			notes: input.notes ?? null,
			receivedBy: userId,
		};

		const items: TPoReceivingItem[] = input.items.map((item) => ({
			id: generateId<TPoReceivingItemId>(),
			receivingId,
			poItemId: item.poItemId as TPoItemId,
			qtyReceived: item.qtyReceived,
			expiryDate: item.expiryDate ?? null,
			batchNumber: item.batchNumber ?? null,
		}));

		return { receiving, items };
	});
